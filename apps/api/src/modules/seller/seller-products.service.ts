import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';
import type {
  CreateProductInput,
  SellerProductDto,
  UpdateProductInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { categories, products } from '../../db/schema.js';
import { toSellerProductDto } from '../../common/mappers.js';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 180) || 'product'
  );
}

@Injectable()
export class SellerProductsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(sellerId: string): Promise<SellerProductDto[]> {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.sellerId, sellerId))
      .orderBy(desc(products.updatedAt));
    return rows.map(toSellerProductDto);
  }

  async create(sellerId: string, input: CreateProductInput): Promise<SellerProductDto> {
    await this.requireCategory(input.categoryId);
    const slug = await this.uniqueSlug(sellerId, input.slug ?? slugify(input.name));

    const [created] = await this.db
      .insert(products)
      .values({
        sellerId,
        categoryId: input.categoryId,
        slug,
        name: input.name,
        description: input.description ?? null,
        specs: input.specs,
        priceRetail: input.priceRetail ?? null,
        priceBulk: input.priceBulk ?? null,
        minBulkQty: input.minBulkQty ?? null,
        priceOnRequest: input.priceOnRequest,
        stockStatus: input.stockStatus,
        listingType: input.listingType,
        media: input.media,
        isPublished: input.isPublished,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
      })
      .returning();
    return toSellerProductDto(created);
  }

  async update(
    sellerId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<SellerProductDto> {
    if (input.categoryId) await this.requireCategory(input.categoryId);
    if (input.slug) {
      const [clash] = await this.db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.sellerId, sellerId),
            eq(products.slug, input.slug),
            ne(products.id, productId),
          ),
        )
        .limit(1);
      if (clash) throw new BadRequestException('Another product already uses this slug.');
    }

    const [updated] = await this.db
      .update(products)
      .set(input)
      .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
      .returning();
    if (!updated) throw new NotFoundException('Product not found.');
    return toSellerProductDto(updated);
  }

  async remove(sellerId: string, productId: string): Promise<void> {
    const deleted = await this.db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
      .returning({ id: products.id });
    if (deleted.length === 0) throw new NotFoundException('Product not found.');
  }

  private async requireCategory(categoryId: string): Promise<void> {
    const [category] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
    if (!category) throw new BadRequestException('Unknown category.');
  }

  /** Append -2, -3… until the slug is free for this seller. */
  private async uniqueSlug(sellerId: string, base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 2; attempt < 50; attempt++) {
      const [existing] = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.sellerId, sellerId), eq(products.slug, candidate)))
        .limit(1);
      if (!existing) return candidate;
      candidate = `${base}-${attempt}`;
    }
    throw new BadRequestException('Could not generate a unique slug; pass one explicitly.');
  }
}
