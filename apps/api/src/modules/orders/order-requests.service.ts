import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { CreateOrderRequestInput, CreatedResourceDto } from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { orderRequests, sellers } from '../../db/schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OrderLifecycleService } from './order-lifecycle.service.js';

@Injectable()
export class OrderRequestsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  async create(input: CreateOrderRequestInput, buyerId: string | null): Promise<CreatedResourceDto> {
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
        buyerId,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone.startsWith('+91') ? input.buyerPhone : `+91${input.buyerPhone}`,
        deliveryAddress: input.deliveryAddress,
        orderType: input.orderType,
        eventDate: input.eventDate ?? null,
        transportPreference: input.transportPreference ?? null,
        freightTerm: input.freightTerm ?? null,
        buyerNotes: input.buyerNotes ?? null,
        items: input.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          notes: item.notes,
        })),
      })
      .returning();

    await this.lifecycle.addEvent(
      created.id,
      { type: 'buyer', id: buyerId ?? undefined, name: input.buyerName },
      { status: 'new', note: 'Order request placed.' },
    );

    await this.notify(seller, input, created.orderNumber);
    return { id: created.id };
  }

  private async notify(
    seller: { businessName: string; whatsappNumber: string; email: string | null },
    input: CreateOrderRequestInput,
    orderNumber: string,
  ): Promise<void> {
    const itemLines = input.items
      .map((item) => `  - ${item.name} × ${item.qty}${item.notes ? ` (${item.notes})` : ''}`)
      .join('\n');
    const lines = [
      `New ${input.orderType} order request ${orderNumber} on TradeKwik for ${seller.businessName}`,
      `From: ${input.buyerName}`,
      `Phone: ${input.buyerPhone}`,
      input.eventDate ? `Event date: ${input.eventDate}` : null,
      `Deliver to: ${input.deliveryAddress}`,
      input.transportPreference ? `Preferred transport: ${input.transportPreference}` : null,
      input.freightTerm ? `Freight: ${input.freightTerm}` : null,
      `Items:\n${itemLines}`,
      input.buyerNotes ? `Notes: ${input.buyerNotes}` : null,
    ].filter((line): line is string => line !== null);
    const text = lines.join('\n');

    await this.notifications.sendWhatsApp(seller.whatsappNumber, text);
    if (seller.email) {
      await this.notifications.sendEmail(seller.email, 'New order request on TradeKwik', text);
    }
  }
}
