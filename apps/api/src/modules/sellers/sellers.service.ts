import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type {
  ProductWithSellerDto,
  PublicProductDto,
  PublicSellerDto,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { products, sellers, type Seller } from '../../db/schema.js';
import {
  toPublicProductDto,
  toPublicSellerDto,
  toSellerCardDto,
} from '../../common/mappers.js';

@Injectable()
export class SellersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Active seller row by slug, or 404. */
  private async requireActiveSeller(slug: string): Promise<Seller> {
    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(and(eq(sellers.slug, slug), eq(sellers.status, 'active')))
      .limit(1);
    if (!seller) {
      throw new NotFoundException('This store does not exist or is not available.');
    }
    return seller;
  }

  async getProfile(slug: string): Promise<PublicSellerDto> {
    return toPublicSellerDto(await this.requireActiveSeller(slug));
  }

  async getProducts(slug: string): Promise<PublicProductDto[]> {
    const seller = await this.requireActiveSeller(slug);
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.sellerId, seller.id), eq(products.isPublished, true)))
      .orderBy(desc(products.updatedAt));
    return rows.map(toPublicProductDto);
  }

  async getProduct(slug: string, productSlug: string): Promise<ProductWithSellerDto> {
    const seller = await this.requireActiveSeller(slug);
    const [product] = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.sellerId, seller.id),
          eq(products.slug, productSlug),
          eq(products.isPublished, true),
        ),
      )
      .limit(1);
    if (!product) {
      throw new NotFoundException('This product does not exist or is not available.');
    }
    return { ...toPublicProductDto(product), seller: toSellerCardDto(seller) };
  }
}
