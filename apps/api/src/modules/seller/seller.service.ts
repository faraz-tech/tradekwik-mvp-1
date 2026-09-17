import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import type {
  SellerDashboardDto,
  SellerProfileDto,
  UpdateSellerProfileInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { inquiries, orderRequests, products, sellers } from '../../db/schema.js';
import { toSellerProfileDto } from '../../common/mappers.js';

@Injectable()
export class SellerService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Dates are bucketed in IST on both sides so the trend is timezone-safe. */
  private static readonly IST_DAY = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  async getDashboard(sellerId: string): Promise<SellerDashboardDto> {
    // safe lower bound: a bit more than 7 IST days back
    const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    const [[newInq], [newOrd], [pubProd], [allProd], trendRows] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(inquiries)
        .where(and(eq(inquiries.sellerId, sellerId), eq(inquiries.status, 'new'))),
      this.db
        .select({ value: count() })
        .from(orderRequests)
        .where(and(eq(orderRequests.sellerId, sellerId), eq(orderRequests.status, 'new'))),
      this.db
        .select({ value: count() })
        .from(products)
        .where(and(eq(products.sellerId, sellerId), eq(products.isPublished, true))),
      this.db
        .select({ value: count() })
        .from(products)
        .where(eq(products.sellerId, sellerId)),
      this.db
        .select({
          day: sql<string>`to_char(${inquiries.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`,
          value: count(),
        })
        .from(inquiries)
        .where(and(eq(inquiries.sellerId, sellerId), gte(inquiries.createdAt, sevenDaysAgo)))
        .groupBy(sql`to_char(${inquiries.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`),
    ]);

    // zero-fill the last 7 IST days, oldest first
    const byDay = new Map(trendRows.map((row) => [row.day, row.value]));
    const inquiryTrend: SellerDashboardDto['inquiryTrend'] = [];
    for (let i = 6; i >= 0; i--) {
      const key = SellerService.IST_DAY.format(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
      inquiryTrend.push({ date: key, count: byDay.get(key) ?? 0 });
    }

    return {
      newInquiries: newInq.value,
      newOrders: newOrd.value,
      publishedProducts: pubProd.value,
      totalProducts: allProd.value,
      inquiryTrend,
    };
  }

  async getProfile(sellerId: string): Promise<SellerProfileDto> {
    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);
    if (!seller) throw new NotFoundException('Store not found.');
    return toSellerProfileDto(seller);
  }

  async updateProfile(
    sellerId: string,
    input: UpdateSellerProfileInput,
  ): Promise<SellerProfileDto> {
    const [updated] = await this.db
      .update(sellers)
      .set(input)
      .where(eq(sellers.id, sellerId))
      .returning();
    if (!updated) throw new NotFoundException('Store not found.');
    return toSellerProfileDto(updated);
  }
}
