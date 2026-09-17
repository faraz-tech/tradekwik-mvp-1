import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { SitemapDataDto } from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { categories, products, sellers } from '../../db/schema.js';

@Injectable()
export class SitemapService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getData(): Promise<SitemapDataDto> {
    const [categoryRows, sellerRows, productRows] = await Promise.all([
      this.db
        .select({ slug: categories.slug, updatedAt: categories.updatedAt })
        .from(categories),
      this.db
        .select({ slug: sellers.slug, updatedAt: sellers.updatedAt })
        .from(sellers)
        .where(eq(sellers.status, 'active')),
      this.db
        .select({
          sellerSlug: sellers.slug,
          productSlug: products.slug,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .where(and(eq(products.isPublished, true), eq(sellers.status, 'active'))),
    ]);

    return {
      categories: categoryRows.map((row) => ({
        slug: row.slug,
        updatedAt: row.updatedAt.toISOString(),
      })),
      sellers: sellerRows.map((row) => ({
        slug: row.slug,
        updatedAt: row.updatedAt.toISOString(),
      })),
      products: productRows.map((row) => ({
        sellerSlug: row.sellerSlug,
        productSlug: row.productSlug,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
}
