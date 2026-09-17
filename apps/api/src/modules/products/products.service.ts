import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { ProductSearchQuery, ProductWithSellerDto } from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { categories, products, sellers } from '../../db/schema.js';
import { toPublicProductDto, toSellerCardDto } from '../../common/mappers.js';

export interface ProductSearchResult {
  items: ProductWithSellerDto[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable()
export class ProductsService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Search/browse published products of active sellers (Postgres ILIKE). */
  async search(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const conditions: SQL[] = [
      eq(products.isPublished, true),
      eq(sellers.status, 'active'),
    ];

    if (query.category) {
      conditions.push(eq(categories.slug, query.category));
    }
    if (query.q) {
      const pattern = `%${query.q}%`;
      const textMatch = or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
      );
      if (textMatch) conditions.push(textMatch);
    }
    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ product: products, seller: sellers })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(desc(products.updatedAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db
        .select({ total: count() })
        .from(products)
        .innerJoin(sellers, eq(products.sellerId, sellers.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(where),
    ]);

    return {
      items: rows.map(({ product, seller }) => ({
        ...toPublicProductDto(product),
        seller: toSellerCardDto(seller),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }
}
