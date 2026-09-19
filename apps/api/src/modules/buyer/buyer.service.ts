import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import type {
  BuyerDashboardDto,
  BuyerInquiryDto,
  BuyerOrderActionInput,
  BuyerOrderDetailDto,
  BuyerOrderDto,
  BuyerProfileDto,
  UpdateBuyerProfileInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  buyers,
  inquiries,
  orderRequests,
  products,
  sellers,
  shipments,
  type OrderRequest,
  type Seller,
} from '../../db/schema.js';
import { toBuyerProfileDto, toSellerCardDto } from '../../common/mappers.js';
import { OrderLifecycleService } from '../orders/order-lifecycle.service.js';

function toBuyerOrderDto(order: OrderRequest, seller: Seller): BuyerOrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    seller: toSellerCardDto(seller, true),
    orderType: order.orderType,
    eventDate: order.eventDate,
    items: order.items,
    status: order.status,
    deliveryAddress: order.deliveryAddress,
    transportPreference: order.transportPreference,
    freightTerm: order.freightTerm,
    buyerNotes: order.buyerNotes,
    quotedAmount: order.quotedAmount,
    agreedAmount: order.agreedAmount,
    expectedDeliveryOn: order.expectedDeliveryOn,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

@Injectable()
export class BuyerService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  // ---------- profile ----------

  async getProfile(buyerId: string): Promise<BuyerProfileDto> {
    const [row] = await this.db.select().from(buyers).where(eq(buyers.id, buyerId)).limit(1);
    if (!row) throw new NotFoundException('Account not found.');
    return toBuyerProfileDto(row);
  }

  async updateProfile(buyerId: string, input: UpdateBuyerProfileInput): Promise<BuyerProfileDto> {
    const [row] = await this.db
      .update(buyers)
      .set(input)
      .where(eq(buyers.id, buyerId))
      .returning();
    if (!row) throw new NotFoundException('Account not found.');
    return toBuyerProfileDto(row);
  }

  // ---------- dashboard ----------

  async getDashboard(buyerId: string): Promise<BuyerDashboardDto> {
    const [[openInq], [active], [transit], [done], recent] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(inquiries)
        .where(and(eq(inquiries.buyerId, buyerId), inArray(inquiries.status, ['new', 'contacted', 'quoted']))),
      this.db
        .select({ value: count() })
        .from(orderRequests)
        .where(
          and(
            eq(orderRequests.buyerId, buyerId),
            inArray(orderRequests.status, ['new', 'confirmed', 'in_progress', 'ready', 'dispatched', 'delivered']),
          ),
        ),
      this.db
        .select({ value: count() })
        .from(orderRequests)
        .where(and(eq(orderRequests.buyerId, buyerId), eq(orderRequests.status, 'dispatched'))),
      this.db
        .select({ value: count() })
        .from(orderRequests)
        .where(and(eq(orderRequests.buyerId, buyerId), eq(orderRequests.status, 'completed'))),
      this.db
        .select({ order: orderRequests, seller: sellers })
        .from(orderRequests)
        .innerJoin(sellers, eq(orderRequests.sellerId, sellers.id))
        .where(eq(orderRequests.buyerId, buyerId))
        .orderBy(desc(orderRequests.updatedAt))
        .limit(5),
    ]);

    return {
      openInquiries: openInq.value,
      activeOrders: active.value,
      inTransit: transit.value,
      completedOrders: done.value,
      recentOrders: recent.map(({ order, seller }) => toBuyerOrderDto(order, seller)),
    };
  }

  // ---------- inquiries ----------

  async listInquiries(buyerId: string): Promise<BuyerInquiryDto[]> {
    const rows = await this.db
      .select({
        inquiry: inquiries,
        seller: sellers,
        productName: products.name,
        productSlug: products.slug,
        orderId: orderRequests.id,
      })
      .from(inquiries)
      .innerJoin(sellers, eq(inquiries.sellerId, sellers.id))
      .leftJoin(products, eq(inquiries.productId, products.id))
      .leftJoin(orderRequests, eq(orderRequests.inquiryId, inquiries.id))
      .where(eq(inquiries.buyerId, buyerId))
      .orderBy(desc(inquiries.createdAt));

    return rows.map(({ inquiry, seller, productName, productSlug, orderId }) => ({
      id: inquiry.id,
      seller: toSellerCardDto(seller, true),
      productId: inquiry.productId,
      productName,
      productSlug,
      quantity: inquiry.quantity,
      message: inquiry.message,
      status: inquiry.status,
      orderId,
      createdAt: inquiry.createdAt.toISOString(),
    }));
  }

  // ---------- orders ----------

  async listOrders(buyerId: string): Promise<BuyerOrderDto[]> {
    const rows = await this.db
      .select({ order: orderRequests, seller: sellers })
      .from(orderRequests)
      .innerJoin(sellers, eq(orderRequests.sellerId, sellers.id))
      .where(eq(orderRequests.buyerId, buyerId))
      .orderBy(desc(orderRequests.createdAt));
    return rows.map(({ order, seller }) => toBuyerOrderDto(order, seller));
  }

  async orderDetail(buyerId: string, orderId: string): Promise<BuyerOrderDetailDto> {
    const { order, seller } = await this.requireBuyerOrder(buyerId, orderId);
    const [events, shipment] = await Promise.all([
      this.lifecycle.listEvents(orderId, true),
      this.lifecycle.getShipment(orderId),
    ]);
    return { ...toBuyerOrderDto(order, seller), events, shipment };
  }

  /** Buyer-side actions: confirm goods received, cancel a fresh request, or message the seller. */
  async orderAction(
    buyerId: string,
    orderId: string,
    input: BuyerOrderActionInput,
    buyerName: string,
  ): Promise<BuyerOrderDetailDto> {
    const { order } = await this.requireBuyerOrder(buyerId, orderId);
    const actor = { type: 'buyer' as const, id: buyerId, name: buyerName };

    if (input.action === 'confirm_received') {
      if (order.status !== 'dispatched' && order.status !== 'delivered') {
        throw new BadRequestException('You can confirm receipt once the order is dispatched.');
      }
      await this.db
        .update(orderRequests)
        .set({ status: 'completed' })
        .where(eq(orderRequests.id, orderId));
      await this.db
        .update(shipments)
        .set({ status: 'delivered', deliveredAt: new Date() })
        .where(eq(shipments.orderRequestId, orderId));
      await this.lifecycle.addEvent(orderId, actor, {
        status: 'completed',
        note: input.note ?? 'Buyer confirmed the goods were received.',
      });
      await this.lifecycle.notifySeller(order, `${buyerName} confirmed receipt of the goods.`);
    } else if (input.action === 'cancel') {
      if (order.status !== 'new') {
        throw new BadRequestException(
          'This order is already confirmed. Please contact the seller to cancel it.',
        );
      }
      await this.db
        .update(orderRequests)
        .set({ status: 'cancelled' })
        .where(eq(orderRequests.id, orderId));
      await this.lifecycle.addEvent(orderId, actor, {
        status: 'cancelled',
        note: input.note ?? 'Cancelled by the buyer.',
      });
      await this.lifecycle.notifySeller(order, `${buyerName} cancelled the request.`);
    } else {
      if (!input.note?.trim()) throw new BadRequestException('Please write a message.');
      await this.lifecycle.addEvent(orderId, actor, { note: input.note });
      await this.lifecycle.notifySeller(order, `Message from ${buyerName}: ${input.note}`);
    }

    return this.orderDetail(buyerId, orderId);
  }

  private async requireBuyerOrder(
    buyerId: string,
    orderId: string,
  ): Promise<{ order: OrderRequest; seller: Seller }> {
    const [row] = await this.db
      .select({ order: orderRequests, seller: sellers })
      .from(orderRequests)
      .innerJoin(sellers, eq(orderRequests.sellerId, sellers.id))
      .where(and(eq(orderRequests.id, orderId), eq(orderRequests.buyerId, buyerId)))
      .limit(1);
    if (!row) throw new NotFoundException('Order not found.');
    return row;
  }
}
