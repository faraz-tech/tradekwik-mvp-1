import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { CreateOrderRequestInput, CreatedResourceDto } from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { orderRequests, sellers } from '../../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class OrderRequestsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateOrderRequestInput): Promise<CreatedResourceDto> {
    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(and(eq(sellers.id, input.sellerId), eq(sellers.status, 'active')))
      .limit(1);
    if (!seller) {
      throw new BadRequestException('This seller is not accepting orders right now.');
    }

    const [created] = await this.db
      .insert(orderRequests)
      .values({
        sellerId: seller.id,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        deliveryAddress: input.deliveryAddress,
        orderType: input.orderType,
        eventDate: input.eventDate ?? null,
        items: input.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          notes: item.notes,
        })),
      })
      .returning({ id: orderRequests.id });

    await this.notify(seller, input);
    return { id: created.id };
  }

  private async notify(
    seller: { businessName: string; whatsappNumber: string; email: string | null },
    input: CreateOrderRequestInput,
  ): Promise<void> {
    const itemLines = input.items
      .map((item) => `  - ${item.name} × ${item.qty}${item.notes ? ` (${item.notes})` : ''}`)
      .join('\n');
    const lines = [
      `New ${input.orderType} order request on TradeKwik for ${seller.businessName}`,
      `From: ${input.buyerName}`,
      `Phone: ${input.buyerPhone}`,
      input.eventDate ? `Event date: ${input.eventDate}` : null,
      `Deliver to: ${input.deliveryAddress}`,
      `Items:\n${itemLines}`,
    ].filter((line): line is string => line !== null);
    const text = lines.join('\n');

    await this.notifications.sendWhatsApp(seller.whatsappNumber, text);
    if (seller.email) {
      await this.notifications.sendEmail(seller.email, 'New order request on TradeKwik', text);
    }
  }
}
