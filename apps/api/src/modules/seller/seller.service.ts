import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { and, asc, count, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import type {
  CreateOwnerInput,
  CreateTeamMemberInput,
  SellerCompanyProfileInput,
  SellerCompanyProfileOwnDto,
  SellerDashboardDto,
  SellerOwnerDto,
  SellerProfileDto,
  SellerTeamMemberDto,
  UpdateOwnerInput,
  UpdateSellerProfileInput,
  UpdateTeamMemberInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  inquiries,
  orderRequests,
  products,
  sellerDocuments,
  sellerOwners,
  sellerProfiles,
  sellerUsers,
  sellers,
} from '../../db/schema.js';
import {
  toCompanyProfileOwnDto,
  toSellerOwnerDto,
  toSellerProfileDto,
  toTeamMemberDto,
} from '../../common/mappers.js';
import { normalizePhone } from '../auth/auth.service.js';

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

    const [[newInq], [newOrd], [openOrd], [pubProd], [allProd], trendRows, [seller], [profile], [docCount]] = await Promise.all([
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
        .from(orderRequests)
        .where(
          and(
            eq(orderRequests.sellerId, sellerId),
            inArray(orderRequests.status, ['confirmed', 'in_progress', 'ready', 'dispatched']),
          ),
        ),
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
      this.db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1),
      this.db.select({ sellerId: sellerProfiles.sellerId }).from(sellerProfiles).where(eq(sellerProfiles.sellerId, sellerId)).limit(1),
      this.db.select({ value: count() }).from(sellerDocuments).where(eq(sellerDocuments.sellerId, sellerId)),
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
      openOrders: openOrd.value,
      publishedProducts: pubProd.value,
      totalProducts: allProd.value,
      inquiryTrend,
      onboarding: {
        storeSettings: Boolean(seller?.description && seller.address && seller.logoUrl),
        companyProfile: Boolean(profile),
        firstProduct: pubProd.value > 0,
        documents: docCount.value > 0,
        isVerified: seller?.isVerified ?? false,
      },
    };
  }

  // ---------- store profile ----------

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
    const values = {
      ...input,
      phone: input.phone ? normalizePhone(input.phone) : undefined,
      whatsappNumber: input.whatsappNumber ? normalizePhone(input.whatsappNumber) : undefined,
    };
    const [updated] = await this.db
      .update(sellers)
      .set(values)
      .where(eq(sellers.id, sellerId))
      .returning();
    if (!updated) throw new NotFoundException('Store not found.');
    return toSellerProfileDto(updated);
  }

  // ---------- company profile (About page) ----------

  async getCompanyProfile(sellerId: string): Promise<SellerCompanyProfileOwnDto> {
    const [row] = await this.db
      .select()
      .from(sellerProfiles)
      .where(eq(sellerProfiles.sellerId, sellerId))
      .limit(1);
    return toCompanyProfileOwnDto(row);
  }

  async updateCompanyProfile(
    sellerId: string,
    input: SellerCompanyProfileInput,
  ): Promise<SellerCompanyProfileOwnDto> {
    const [row] = await this.db
      .insert(sellerProfiles)
      .values({ sellerId, ...input })
      .onConflictDoUpdate({ target: sellerProfiles.sellerId, set: { ...input } })
      .returning();
    return toCompanyProfileOwnDto(row);
  }

  // ---------- owners ----------

  async listOwners(sellerId: string): Promise<SellerOwnerDto[]> {
    const rows = await this.db
      .select()
      .from(sellerOwners)
      .where(eq(sellerOwners.sellerId, sellerId))
      .orderBy(asc(sellerOwners.sortOrder), asc(sellerOwners.createdAt));
    return rows.map(toSellerOwnerDto);
  }

  async createOwner(sellerId: string, input: CreateOwnerInput): Promise<SellerOwnerDto> {
    if (input.isPrimary) await this.clearPrimary(sellerId);
    const [row] = await this.db
      .insert(sellerOwners)
      .values({ sellerId, ...input })
      .returning();
    return toSellerOwnerDto(row);
  }

  async updateOwner(
    sellerId: string,
    ownerId: string,
    input: UpdateOwnerInput,
  ): Promise<SellerOwnerDto> {
    if (input.isPrimary) await this.clearPrimary(sellerId, ownerId);
    const [row] = await this.db
      .update(sellerOwners)
      .set(input)
      .where(and(eq(sellerOwners.id, ownerId), eq(sellerOwners.sellerId, sellerId)))
      .returning();
    if (!row) throw new NotFoundException('Owner not found.');
    return toSellerOwnerDto(row);
  }

  async removeOwner(sellerId: string, ownerId: string): Promise<void> {
    const deleted = await this.db
      .delete(sellerOwners)
      .where(and(eq(sellerOwners.id, ownerId), eq(sellerOwners.sellerId, sellerId)))
      .returning({ id: sellerOwners.id });
    if (deleted.length === 0) throw new NotFoundException('Owner not found.');
  }

  private async clearPrimary(sellerId: string, exceptId?: string): Promise<void> {
    await this.db
      .update(sellerOwners)
      .set({ isPrimary: false })
      .where(
        exceptId
          ? and(eq(sellerOwners.sellerId, sellerId), ne(sellerOwners.id, exceptId))
          : eq(sellerOwners.sellerId, sellerId),
      );
  }

  // ---------- team (seller users) ----------

  async listTeam(sellerId: string): Promise<SellerTeamMemberDto[]> {
    const rows = await this.db
      .select()
      .from(sellerUsers)
      .where(eq(sellerUsers.sellerId, sellerId))
      .orderBy(asc(sellerUsers.createdAt));
    return rows.map(toTeamMemberDto);
  }

  async createTeamMember(sellerId: string, input: CreateTeamMemberInput): Promise<SellerTeamMemberDto> {
    const phone = normalizePhone(input.phone);
    const [taken] = await this.db
      .select({ id: sellerUsers.id })
      .from(sellerUsers)
      .where(eq(sellerUsers.phone, phone))
      .limit(1);
    if (taken) throw new BadRequestException('A user with this phone already exists.');

    const [row] = await this.db
      .insert(sellerUsers)
      .values({
        sellerId,
        name: input.name,
        phone,
        email: input.email ?? null,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: input.role,
      })
      .returning();
    return toTeamMemberDto(row);
  }

  async updateTeamMember(
    sellerId: string,
    userId: string,
    actingUserId: string,
    input: UpdateTeamMemberInput,
  ): Promise<SellerTeamMemberDto> {
    const [existing] = await this.db
      .select()
      .from(sellerUsers)
      .where(and(eq(sellerUsers.id, userId), eq(sellerUsers.sellerId, sellerId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Team member not found.');
    if (existing.role === 'owner' && input.role) {
      throw new BadRequestException('The owner role cannot be changed.');
    }
    if (existing.id === actingUserId && input.role) {
      throw new BadRequestException('You cannot change your own role.');
    }

    const [row] = await this.db
      .update(sellerUsers)
      .set({
        name: input.name,
        role: input.role,
        passwordHash: input.password ? await bcrypt.hash(input.password, 10) : undefined,
      })
      .where(eq(sellerUsers.id, userId))
      .returning();
    return toTeamMemberDto(row);
  }

  async removeTeamMember(sellerId: string, userId: string, actingUserId: string): Promise<void> {
    if (userId === actingUserId) throw new BadRequestException('You cannot remove yourself.');
    const [existing] = await this.db
      .select({ role: sellerUsers.role })
      .from(sellerUsers)
      .where(and(eq(sellerUsers.id, userId), eq(sellerUsers.sellerId, sellerId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Team member not found.');
    if (existing.role === 'owner') throw new BadRequestException('The owner cannot be removed.');
    await this.db.delete(sellerUsers).where(eq(sellerUsers.id, userId));
  }
}
