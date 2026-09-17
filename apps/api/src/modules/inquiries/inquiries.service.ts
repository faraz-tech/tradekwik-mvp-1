import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { CreateInquiryInput, CreatedResourceDto } from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { inquiries, products, sellers } from '../../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class InquiriesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateInquiryInput): Promise<CreatedResourceDto> {
    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(and(eq(sellers.id, input.sellerId), eq(sellers.status, 'active')))
      .limit(1);
    if (!seller) {
      throw new BadRequestException('This seller is not accepting inquiries right now.');
    }

    let productName: string | null = null;
    if (input.productId) {
      const [product] = await this.db
        .select({ name: products.name })
        .from(products)
        .where(
          and(
            eq(products.id, input.productId),
            eq(products.sellerId, seller.id),
            eq(products.isPublished, true),
          ),
        )
        .limit(1);
      if (!product) {
        throw new BadRequestException('This product is no longer available.');
      }
      productName = product.name;
    }

    const [created] = await this.db
      .insert(inquiries)
      .values({
        sellerId: seller.id,
        productId: input.productId ?? null,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        buyerCity: input.buyerCity ?? null,
        buyerType: input.buyerType,
        quantity: input.quantity ?? null,
        message: input.message,
        source: input.source,
      })
      .returning({ id: inquiries.id });

    await this.notify(seller, input, productName);
    return { id: created.id };
  }

  private async notify(
    seller: { businessName: string; whatsappNumber: string; email: string | null },
    input: CreateInquiryInput,
    productName: string | null,
  ): Promise<void> {
    const lines = [
      `New inquiry on TradeKwik for ${seller.businessName}`,
      productName ? `Product: ${productName}` : null,
      `From: ${input.buyerName} (${input.buyerType})`,
      `Phone: ${input.buyerPhone}`,
      input.buyerCity ? `City: ${input.buyerCity}` : null,
      input.quantity ? `Quantity: ${input.quantity}` : null,
      `Message: ${input.message}`,
    ].filter((line): line is string => line !== null);
    const text = lines.join('\n');

    await this.notifications.sendWhatsApp(seller.whatsappNumber, text);
    if (seller.email) {
      await this.notifications.sendEmail(seller.email, 'New inquiry on TradeKwik', text);
    }
  }
}
