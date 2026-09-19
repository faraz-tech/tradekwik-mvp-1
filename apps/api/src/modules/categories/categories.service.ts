import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ne } from 'drizzle-orm';
import type {
  AdminCategoryDto,
  CategoryDto,
  CategoryRequestDto,
  CategoryRequestStatus,
  CreateCategoryInput,
  CreateCategoryRequestInput,
  ReviewCategoryRequestInput,
  UpdateCategoryInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { categories, categoryRequests, products, sellers, type CategoryRequest } from '../../db/schema.js';
import { toCategoryDto } from '../../common/mappers.js';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 100) || 'category'
  );
}

function toRequestDto(row: CategoryRequest, sellerName: string | null): CategoryRequestDto {
  return {
    id: row.id,
    sellerId: row.sellerId,
    sellerName,
    name: row.name,
    note: row.note,
    status: row.status,
    adminNote: row.adminNote,
    categoryId: row.categoryId,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Public: active categories, parents first, then by sort order and name. */
  async findAll(): Promise<CategoryDto[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    return rows.map(toCategoryDto);
  }

  // ---------- admin ----------

  async adminList(): Promise<AdminCategoryDto[]> {
    const rows = await this.db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const [prodCounts, sellerCounts] = await Promise.all([
      this.db.select({ id: products.categoryId, value: count() }).from(products).groupBy(products.categoryId),
      this.db.select({ id: sellers.categoryId, value: count() }).from(sellers).groupBy(sellers.categoryId),
    ]);
    const pc = new Map(prodCounts.map((r) => [r.id, r.value]));
    const sc = new Map(sellerCounts.map((r) => [r.id, r.value]));
    return rows.map((r) => ({
      ...toCategoryDto(r),
      isActive: r.isActive,
      parentName: r.parentId ? (byId.get(r.parentId)?.name ?? null) : null,
      productCount: pc.get(r.id) ?? 0,
      sellerCount: sc.get(r.id) ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async create(input: CreateCategoryInput): Promise<AdminCategoryDto> {
    if (input.parentId) await this.requireParent(input.parentId);
    const slug = await this.uniqueSlug(input.slug ?? slugify(input.name));
    const [row] = await this.db
      .insert(categories)
      .values({
        name: input.name,
        slug,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      })
      .returning();
    return this.one(row.id);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<AdminCategoryDto> {
    if (input.parentId) {
      if (input.parentId === id) throw new BadRequestException('A category cannot be its own parent.');
      await this.requireParent(input.parentId);
    }
    if (input.slug) {
      const [clash] = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, input.slug), ne(categories.id, id)))
        .limit(1);
      if (clash) throw new BadRequestException('Another category already uses this slug.');
    }
    const [row] = await this.db.update(categories).set(input).where(eq(categories.id, id)).returning();
    if (!row) throw new NotFoundException('Category not found.');
    return this.one(row.id);
  }

  /** Delete only when nothing references it; otherwise the admin should hide it. */
  async remove(id: string): Promise<void> {
    const [[p], [s], [children]] = await Promise.all([
      this.db.select({ value: count() }).from(products).where(eq(products.categoryId, id)),
      this.db.select({ value: count() }).from(sellers).where(eq(sellers.categoryId, id)),
      this.db.select({ value: count() }).from(categories).where(eq(categories.parentId, id)),
    ]);
    if (p.value > 0 || s.value > 0 || children.value > 0) {
      throw new BadRequestException(
        `This category is in use (${p.value} products, ${s.value} sellers, ${children.value} sub-categories). Hide it instead of deleting.`,
      );
    }
    const deleted = await this.db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    if (deleted.length === 0) throw new NotFoundException('Category not found.');
  }

  // ---------- seller requests ----------

  async createRequest(sellerId: string, input: CreateCategoryRequestInput): Promise<CategoryRequestDto> {
    const [existing] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.slug, slugify(input.name)))
      .limit(1);
    if (existing) {
      throw new BadRequestException(
        existing.isActive
          ? `"${existing.name}" already exists — pick it from the list.`
          : `"${existing.name}" exists but is currently hidden. Contact us to enable it.`,
      );
    }
    const [row] = await this.db
      .insert(categoryRequests)
      .values({ sellerId, name: input.name, note: input.note ?? null })
      .returning();
    return toRequestDto(row, null);
  }

  async listRequests(status?: CategoryRequestStatus, sellerId?: string): Promise<CategoryRequestDto[]> {
    const conditions = [];
    if (status) conditions.push(eq(categoryRequests.status, status));
    if (sellerId) conditions.push(eq(categoryRequests.sellerId, sellerId));
    const rows = await this.db
      .select({ req: categoryRequests, sellerName: sellers.businessName })
      .from(categoryRequests)
      .leftJoin(sellers, eq(categoryRequests.sellerId, sellers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(categoryRequests.createdAt));
    return rows.map(({ req, sellerName }) => toRequestDto(req, sellerName));
  }

  async reviewRequest(id: string, input: ReviewCategoryRequestInput): Promise<CategoryRequestDto> {
    const [req] = await this.db.select().from(categoryRequests).where(eq(categoryRequests.id, id)).limit(1);
    if (!req) throw new NotFoundException('Request not found.');
    if (req.status !== 'pending') throw new BadRequestException('This request was already reviewed.');

    let categoryId: string | null = null;
    if (input.decision === 'approve') {
      const created = await this.create({
        name: input.name ?? req.name,
        parentId: input.parentId ?? null,
        sortOrder: 0,
        isActive: true,
      });
      categoryId = created.id;
    }
    const [row] = await this.db
      .update(categoryRequests)
      .set({
        status: input.decision === 'approve' ? 'approved' : 'rejected',
        adminNote: input.adminNote ?? null,
        categoryId,
        reviewedAt: new Date(),
      })
      .where(eq(categoryRequests.id, id))
      .returning();
    const [seller] = await this.db
      .select({ name: sellers.businessName })
      .from(sellers)
      .where(eq(sellers.id, row.sellerId))
      .limit(1);
    return toRequestDto(row, seller?.name ?? null);
  }

  // ---------- helpers ----------

  private async one(id: string): Promise<AdminCategoryDto> {
    const all = await this.adminList();
    const found = all.find((c) => c.id === id);
    if (!found) throw new NotFoundException('Category not found.');
    return found;
  }

  private async requireParent(parentId: string): Promise<void> {
    const [parent] = await this.db.select({ id: categories.id, parentId: categories.parentId }).from(categories).where(eq(categories.id, parentId)).limit(1);
    if (!parent) throw new BadRequestException('Parent category not found.');
    if (parent.parentId) throw new BadRequestException('Only two levels are supported: pick a top-level parent.');
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 2; attempt < 50; attempt++) {
      const [existing] = await this.db.select({ id: categories.id }).from(categories).where(eq(categories.slug, candidate)).limit(1);
      if (!existing) return candidate;
      candidate = `${base}-${attempt}`;
    }
    throw new BadRequestException('Could not generate a unique slug; pass one explicitly.');
  }
}
