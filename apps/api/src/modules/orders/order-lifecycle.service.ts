import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import {
  ORDER_NEXT_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderActorType,
  type OrderEventDto,
  type OrderRequestStatus,
  type ShipmentDto,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  orderEvents,
  orderRequests,
  sellers,
  shipments,
  type OrderRequest,
} from '../../db/schema.js';
import { toOrderEventDto, toShipmentDto } from '../../common/mappers.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface Actor {
  type: OrderActorType;
  id?: string;
  name?: string | null;
}

/**
 * Shared order lifecycle logic used by the seller panel, the buyer dashboard
 * and the public order form: status transitions, the event trail and
 * buyer/seller notifications.
 */
@Injectable()
export class OrderLifecycleService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async requireOrder(orderId: string): Promise<OrderRequest> {
    const [order] = await this.db
      .select()
      .from(orderRequests)
      .where(eq(orderRequests.id, orderId))
      .limit(1);
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  /** Append an event to the order trail. */
  async addEvent(
    orderId: string,
    actor: Actor,
    input: { status?: OrderRequestStatus | null; note?: string | null; visibleToBuyer?: boolean },
  ): Promise<void> {
    await this.db.insert(orderEvents).values({
      orderRequestId: orderId,
      status: input.status ?? null,
      actorType: actor.type,
      actorId: actor.id ?? null,
      actorName: actor.name ?? null,
      note: input.note ?? null,
      visibleToBuyer: input.visibleToBuyer ?? true,
    });
  }

  /** Validate a status change against the lifecycle graph. */
  assertTransition(from: OrderRequestStatus, to: OrderRequestStatus): void {
    if (from === to) return;
    if (!ORDER_NEXT_STATUSES[from].includes(to)) {
      throw new BadRequestException(
        `Cannot move an order from "${ORDER_STATUS_LABELS[from]}" to "${ORDER_STATUS_LABELS[to]}".`,
      );
    }
  }

  async listEvents(orderId: string, buyerView: boolean): Promise<OrderEventDto[]> {
    const rows = await this.db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderRequestId, orderId))
      .orderBy(asc(orderEvents.createdAt));
    return rows
      .filter((row) => !buyerView || row.visibleToBuyer)
      .map(toOrderEventDto);
  }

  async getShipment(orderId: string): Promise<ShipmentDto | null> {
    const [row] = await this.db
      .select()
      .from(shipments)
      .where(eq(shipments.orderRequestId, orderId))
      .limit(1);
    return row ? toShipmentDto(row) : null;
  }

  /** Tell the buyer (WhatsApp stub) that something changed on their order. */
  async notifyBuyer(order: OrderRequest, text: string): Promise<void> {
    await this.notifications.sendWhatsApp(order.buyerPhone, `[TradeKwik order ${order.orderNumber}] ${text}`);
  }

  /** Tell the seller (WhatsApp + email stub) that the buyer did something. */
  async notifySeller(order: OrderRequest, text: string): Promise<void> {
    const [seller] = await this.db
      .select({ whatsappNumber: sellers.whatsappNumber, email: sellers.email })
      .from(sellers)
      .where(eq(sellers.id, order.sellerId))
      .limit(1);
    if (!seller) return;
    const message = `[TradeKwik order ${order.orderNumber}] ${text}`;
    await this.notifications.sendWhatsApp(seller.whatsappNumber, message);
    if (seller.email) await this.notifications.sendEmail(seller.email, `Order ${order.orderNumber}`, message);
  }
}
