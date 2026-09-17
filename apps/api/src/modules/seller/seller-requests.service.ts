import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type {
  InquiryStatus,
  OrderRequestStatus,
  SellerInquiryDto,
  SellerOrderRequestDto,
  UpdateInquiryInput,
  UpdateOrderRequestInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { inquiries, orderRequests, products } from '../../db/schema.js';
import { toSellerInquiryDto, toSellerOrderRequestDto } from '../../common/mappers.js';

@Injectable()
export class SellerRequestsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listInquiries(sellerId: string, status?: InquiryStatus): Promise<SellerInquiryDto[]> {
    const where = status
      ? and(eq(inquiries.sellerId, sellerId), eq(inquiries.status, status))
      : eq(inquiries.sellerId, sellerId);
    const rows = await this.db
      .select({ inquiry: inquiries, productName: products.name })
      .from(inquiries)
      .leftJoin(products, eq(inquiries.productId, products.id))
      .where(where)
      .orderBy(desc(inquiries.createdAt));
    return rows.map(({ inquiry, productName }) => toSellerInquiryDto(inquiry, productName));
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

    let productName: string | null = null;
    if (updated.productId) {
      const [product] = await this.db
        .select({ name: products.name })
        .from(products)
        .where(eq(products.id, updated.productId))
        .limit(1);
      productName = product?.name ?? null;
    }
    return toSellerInquiryDto(updated, productName);
  }

  async listOrders(
    sellerId: string,
    status?: OrderRequestStatus,
  ): Promise<SellerOrderRequestDto[]> {
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

  async updateOrder(
    sellerId: string,
    orderId: string,
    input: UpdateOrderRequestInput,
  ): Promise<SellerOrderRequestDto> {
    const [updated] = await this.db
      .update(orderRequests)
      .set(input)
      .where(and(eq(orderRequests.id, orderId), eq(orderRequests.sellerId, sellerId)))
      .returning();
    if (!updated) throw new NotFoundException('Order request not found.');
    return toSellerOrderRequestDto(updated);
  }
}
