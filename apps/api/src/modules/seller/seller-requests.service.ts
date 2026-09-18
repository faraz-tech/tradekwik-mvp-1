import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  ORDER_STATUS_LABELS,
  type ConvertInquiryInput,
  type InquiryStatus,
  type OrderRequestStatus,
  type SellerInquiryDto,
  type SellerOrderDetailDto,
  type SellerOrderRequestDto,
  type UpdateInquiryInput,
  type UpdateOrderRequestInput,
  type UpsertShipmentInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  buyers,
  inquiries,
  orderRequests,
  products,
  shipments,
  type OrderRequest,
} from '../../db/schema.js';
import { toSellerInquiryDto, toSellerOrderRequestDto } from '../../common/mappers.js';
import { OrderLifecycleService, type Actor } from '../orders/order-lifecycle.service.js';

@Injectable()
export class SellerRequestsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly lifecycle: OrderLifecycleService,
  ) {}

  // ---------- inquiries ----------

  async listInquiries(sellerId: string, status?: InquiryStatus): Promise<SellerInquiryDto[]> {
    const where = status
      ? and(eq(inquiries.sellerId, sellerId), eq(inquiries.status, status))
      : eq(inquiries.sellerId, sellerId);
    const rows = await this.db
      .select({
        inquiry: inquiries,
        productName: products.name,
        buyerVerification: buyers.verificationStatus,
        orderId: orderRequests.id,
      })
      .from(inquiries)
      .leftJoin(products, eq(inquiries.productId, products.id))
      .leftJoin(buyers, eq(inquiries.buyerId, buyers.id))
      .leftJoin(orderRequests, eq(orderRequests.inquiryId, inquiries.id))
      .where(where)
      .orderBy(desc(inquiries.createdAt));
    return rows.map(({ inquiry, productName, buyerVerification, orderId }) =>
      toSellerInquiryDto(inquiry, productName, { buyerVerificationStatus: buyerVerification, orderId }),
    );
  }

  async updateInquiry(
    sellerId: string,
    inquiryId: string,
    input: UpdateInquiryInput,
  ): Promise<SellerInquiryDto> {
    const [updated] = await this.db
      .update(inquiries)
      .set(input)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.sellerId, sellerId)))
      .returning();
    if (!updated) throw new NotFoundException('Inquiry not found.');
    return this.inquiryDto(updated.id, sellerId);
  }

  private async inquiryDto(inquiryId: string, sellerId: string): Promise<SellerInquiryDto> {
    const [row] = await this.db
      .select({
        inquiry: inquiries,
        productName: products.name,
        buyerVerification: buyers.verificationStatus,
        orderId: orderRequests.id,
      })
      .from(inquiries)
      .leftJoin(products, eq(inquiries.productId, products.id))
      .leftJoin(buyers, eq(inquiries.buyerId, buyers.id))
      .leftJoin(orderRequests, eq(orderRequests.inquiryId, inquiries.id))
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.sellerId, sellerId)))
      .limit(1);
    if (!row) throw new NotFoundException('Inquiry not found.');
    return toSellerInquiryDto(row.inquiry, row.productName, {
      buyerVerificationStatus: row.buyerVerification,
      orderId: row.orderId,
    });
  }

  /** Inquiry → order: the seller quotes and creates the order on the buyer's behalf. */
  async convertInquiry(
    sellerId: string,
    inquiryId: string,
    input: ConvertInquiryInput,
    actor: Actor,
  ): Promise<SellerOrderDetailDto> {
    const [inquiry] = await this.db
      .select()
      .from(inquiries)
      .where(and(eq(inquiries.id, inquiryId), eq(inquiries.sellerId, sellerId)))
      .limit(1);
    if (!inquiry) throw new NotFoundException('Inquiry not found.');

    const [existing] = await this.db
      .select({ id: orderRequests.id })
      .from(orderRequests)
      .where(eq(orderRequests.inquiryId, inquiryId))
      .limit(1);
    if (existing) throw new BadRequestException('This inquiry was already converted to an order.');

    const [order] = await this.db
      .insert(orderRequests)
      .values({
        sellerId,
        buyerId: inquiry.buyerId,
        inquiryId: inquiry.id,
        buyerName: inquiry.buyerName,
        buyerPhone: inquiry.buyerPhone,
        deliveryAddress: input.deliveryAddress,
        orderType: input.orderType,
        items: input.items,
        status: 'confirmed',
        quotedAmount: input.quotedAmount ?? null,
        agreedAmount: input.quotedAmount ?? null,
        expectedDeliveryOn: input.expectedDeliveryOn ?? null,
        freightTerm: input.freightTerm ?? null,
      })
      .returning();

    await this.db
      .update(inquiries)
      .set({ status: 'won' })
      .where(eq(inquiries.id, inquiry.id));

    await this.lifecycle.addEvent(order.id, actor, {
      status: 'confirmed',
      note: input.buyerMessage ?? 'Order created from your inquiry and confirmed by the seller.',
    });
    await this.lifecycle.notifyBuyer(
      order,
      `Your inquiry has been converted into order ${order.orderNumber}.${
        input.quotedAmount ? ` Quoted amount: ₹${input.quotedAmount}.` : ''
      }`,
    );

    return this.orderDetail(sellerId, order.id);
  }

  // ---------- orders ----------

  async listOrders(sellerId: string, status?: OrderRequestStatus): Promise<SellerOrderRequestDto[]> {
    const where = status
      ? and(eq(orderRequests.sellerId, sellerId), eq(orderRequests.status, status))
      : eq(orderRequests.sellerId, sellerId);
    const rows = await this.db
      .select()
      .from(orderRequests)
      .where(where)
      .orderBy(desc(orderRequests.createdAt));
    return rows.map(toSellerOrderRequestDto);
  }

  async orderDetail(sellerId: string, orderId: string): Promise<SellerOrderDetailDto> {
    const order = await this.requireSellerOrder(sellerId, orderId);
    const [events, shipment] = await Promise.all([
      this.lifecycle.listEvents(orderId, false),
      this.lifecycle.getShipment(orderId),
    ]);
    return { ...toSellerOrderRequestDto(order), events, shipment };
  }

  async updateOrder(
    sellerId: string,
    orderId: string,
    input: UpdateOrderRequestInput,
    actor: Actor,
  ): Promise<SellerOrderDetailDto> {
    const order = await this.requireSellerOrder(sellerId, orderId);
    const { buyerMessage, ...fields } = input;

    if (fields.status && fields.status !== order.status) {
      this.lifecycle.assertTransition(order.status, fields.status);
      if (fields.status === 'dispatched') {
        const shipment = await this.lifecycle.getShipment(orderId);
        if (!shipment) {
          throw new BadRequestException(
            'Add the transport details (LR / bilty number) before marking the order dispatched.',
          );
        }
        await this.db
          .update(shipments)
          .set({ status: 'in_transit', dispatchedAt: new Date() })
          .where(eq(shipments.orderRequestId, orderId));
      }
      if (fields.status === 'delivered') {
        await this.db
          .update(shipments)
          .set({ status: 'delivered', deliveredAt: new Date() })
          .where(eq(shipments.orderRequestId, orderId));
      }
    }

    const [updated] = await this.db
      .update(orderRequests)
      .set(fields)
      .where(eq(orderRequests.id, orderId))
      .returning();

    const statusChanged = fields.status && fields.status !== order.status;
    const quoteChanged =
      (fields.quotedAmount !== undefined && fields.quotedAmount !== order.quotedAmount) ||
      (fields.agreedAmount !== undefined && fields.agreedAmount !== order.agreedAmount);

    if (statusChanged || buyerMessage || quoteChanged) {
      const notes: string[] = [];
      if (quoteChanged && fields.quotedAmount != null) notes.push(`Quoted amount ₹${fields.quotedAmount}.`);
      if (quoteChanged && fields.agreedAmount != null) notes.push(`Agreed amount ₹${fields.agreedAmount}.`);
      if (buyerMessage) notes.push(buyerMessage);
      const note = notes.length > 0 ? notes.join(' ') : null;

      await this.lifecycle.addEvent(orderId, actor, {
        status: statusChanged ? fields.status : null,
        note,
        visibleToBuyer: true,
      });
      const text = statusChanged
        ? `Status update: ${ORDER_STATUS_LABELS[fields.status as OrderRequestStatus]}.${note ? ` ${note}` : ''}`
        : note ?? '';
      if (text) await this.lifecycle.notifyBuyer(updated, text);
    }

    return this.orderDetail(sellerId, orderId);
  }

  /** Create or replace the transport booking (bilty) for an order. */
  async upsertShipment(
    sellerId: string,
    orderId: string,
    input: UpsertShipmentInput,
    actor: Actor,
  ): Promise<SellerOrderDetailDto> {
    const order = await this.requireSellerOrder(sellerId, orderId);
    if (order.status === 'cancelled' || order.status === 'completed') {
      throw new BadRequestException('This order is closed.');
    }

    const values = {
      ...input,
      dispatchedAt: input.dispatchedAt ? new Date(input.dispatchedAt) : null,
    };
    const [existing] = await this.db
      .select({ id: shipments.id })
      .from(shipments)
      .where(eq(shipments.orderRequestId, orderId))
      .limit(1);

    if (existing) {
      await this.db.update(shipments).set(values).where(eq(shipments.id, existing.id));
    } else {
      await this.db.insert(shipments).values({ orderRequestId: orderId, ...values });
    }

    await this.lifecycle.addEvent(orderId, actor, {
      note: `${existing ? 'Transport details updated' : 'Transport booked'}: ${input.transportName}, LR/bilty no. ${input.lrNumber}${
        input.expectedDeliveryOn ? `, expected by ${input.expectedDeliveryOn}` : ''
      }.`,
    });
    await this.lifecycle.notifyBuyer(
      order,
      `Transport booked via ${input.transportName}. LR/bilty number: ${input.lrNumber}. Track it in your TradeKwik dashboard.`,
    );

    return this.orderDetail(sellerId, orderId);
  }

  private async requireSellerOrder(sellerId: string, orderId: string): Promise<OrderRequest> {
    const [order] = await this.db
      .select()
      .from(orderRequests)
      .where(and(eq(orderRequests.id, orderId), eq(orderRequests.sellerId, sellerId)))
      .limit(1);
    if (!order) throw new NotFoundException('Order request not found.');
    return order;
  }
}
