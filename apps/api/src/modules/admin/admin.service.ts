import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import type {
  AdminInquiryDto,
  AdminSellerDto,
  AdminUpdateSellerInput,
  CreateSellerInput,
  PlatformOverviewDto,
  SellerStatus,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  categories,
  inquiries,
  orderRequests,
  products,
  sellerUsers,
  sellers,
  type Seller,
} from '../../db/schema.js';
import { toSellerInquiryDto, toSellerProfileDto } from '../../common/mappers.js';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 180) || 'store'
  );
}

function normalizePhone(phone: string): string {
  return phone.startsWith('+91') ? phone : `+91${phone}`;
}

@Injectable()
export class AdminService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listSellers(status?: SellerStatus): Promise<AdminSellerDto[]> {
    const rows = await this.db
      .select({
        seller: sellers,
        ownerName: sellerUsers.name,
        ownerPhone: sellerUsers.phone,
        productCount: sql<number>`(
          select count(*)::int from ${products} where ${products.sellerId} = ${sellers.id}
        )`,
      })
      .from(sellers)
      .leftJoin(
        sellerUsers,
        and(eq(sellerUsers.sellerId, sellers.id), eq(sellerUsers.role, 'owner')),
      )
      .where(status ? eq(sellers.status, status) : undefined)
      .orderBy(desc(sellers.createdAt));

    return rows.map(({ seller, ownerName, ownerPhone, productCount }) => ({
      ...toSellerProfileDto(seller),
      ownerName,
      ownerPhone,
      productCount,
    }));
  }

  async createSeller(input: CreateSellerInput): Promise<AdminSellerDto> {
    const [category] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);
    if (!category) throw new BadRequestException('Unknown category.');

    const ownerPhone = normalizePhone(input.owner.phone);
    const [phoneTaken] = await this.db
      .select({ id: sellerUsers.id })
      .from(sellerUsers)
      .where(eq(sellerUsers.phone, ownerPhone))
      .limit(1);
    if (phoneTaken) {
      throw new BadRequestException('A seller user with this phone already exists.');
    }

    const slug = await this.uniqueSlug(input.slug ?? slugify(input.businessName));
    const passwordHash = await bcrypt.hash(input.owner.password, 10);

    const created = await this.db.transaction(async (tx) => {
      const [seller] = await tx
        .insert(sellers)
        .values({
          slug,
          businessName: input.businessName,
          categoryId: input.categoryId,
          description: input.description ?? null,
          city: input.city,
          state: input.state,
          address: input.address ?? null,
          phone: normalizePhone(input.phone),
          whatsappNumber: normalizePhone(input.whatsappNumber),
          email: input.email ?? null,
          gstNumber: input.gstNumber ?? null,
          servesPanIndia: input.servesPanIndia,
          deliveryRadiusKm: input.deliveryRadiusKm ?? null,
          status: input.status,
        })
        .returning();

      await tx.insert(sellerUsers).values({
        sellerId: seller.id,
        name: input.owner.name,
        phone: ownerPhone,
        email: input.owner.email ?? null,
        passwordHash,
        role: 'owner',
      });

      return seller;
    });

    return {
      ...toSellerProfileDto(created),
      ownerName: input.owner.name,
      ownerPhone,
      productCount: 0,
    };
  }

  async updateSeller(id: string, input: AdminUpdateSellerInput): Promise<AdminSellerDto> {
    const [updated] = await this.db
      .update(sellers)
      .set(input)
      .where(eq(sellers.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Seller not found.');
    return this.withOwner(updated);
  }

  async listInquiries(): Promise<AdminInquiryDto[]> {
    const rows = await this.db
      .select({
        inquiry: inquiries,
        productName: products.name,
        sellerName: sellers.businessName,
        sellerSlug: sellers.slug,
      })
      .from(inquiries)
      .innerJoin(sellers, eq(inquiries.sellerId, sellers.id))
      .leftJoin(products, eq(inquiries.productId, products.id))
      .orderBy(desc(inquiries.createdAt))
      .limit(200);

    return rows.map(({ inquiry, productName, sellerName, sellerSlug }) => ({
      ...toSellerInquiryDto(inquiry, productName),
      sellerName,
      sellerSlug,
    }));
  }

  async getOverview(): Promise<PlatformOverviewDto> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [sellerRows, [prodTotal], [prodPublished], [inqTotal], [inqRecent], [ordTotal], [ordRecent]] =
      await Promise.all([
        this.db
          .select({ status: sellers.status, value: count() })
          .from(sellers)
          .groupBy(sellers.status),
        this.db.select({ value: count() }).from(products),
        this.db.select({ value: count() }).from(products).where(eq(products.isPublished, true)),
        this.db.select({ value: count() }).from(inquiries),
        this.db.select({ value: count() }).from(inquiries).where(gte(inquiries.createdAt, sevenDaysAgo)),
        this.db.select({ value: count() }).from(orderRequests),
        this.db
          .select({ value: count() })
          .from(orderRequests)
          .where(gte(orderRequests.createdAt, sevenDaysAgo)),
      ]);

    const byStatus = new Map(sellerRows.map((row) => [row.status, row.value]));
    const active = byStatus.get('active') ?? 0;
    const pending = byStatus.get('pending') ?? 0;
    const suspended = byStatus.get('suspended') ?? 0;

    return {
      sellers: { total: active + pending + suspended, active, pending, suspended },
      products: { total: prodTotal.value, published: prodPublished.value },
      inquiries: { total: inqTotal.value, last7Days: inqRecent.value },
      orderRequests: { total: ordTotal.value, last7Days: ordRecent.value },
    };
  }

  private async withOwner(seller: Seller): Promise<AdminSellerDto> {
    const [owner] = await this.db
      .select({ name: sellerUsers.name, phone: sellerUsers.phone })
      .from(sellerUsers)
      .where(and(eq(sellerUsers.sellerId, seller.id), eq(sellerUsers.role, 'owner')))
      .limit(1);
    const [prodCount] = await this.db
      .select({ value: count() })
      .from(products)
      .where(eq(products.sellerId, seller.id));
    return {
      ...toSellerProfileDto(seller),
      ownerName: owner?.name ?? null,
      ownerPhone: owner?.phone ?? null,
      productCount: prodCount.value,
    };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 2; attempt < 50; attempt++) {
      const [existing] = await this.db
        .select({ id: sellers.id })
        .from(sellers)
        .where(eq(sellers.slug, candidate))
        .limit(1);
      if (!existing) return candidate;
      candidate = `${base}-${attempt}`;
    }
    throw new BadRequestException('Could not generate a unique slug; pass one explicitly.');
  }
}
