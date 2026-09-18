import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type {
  ListingType,
  PublicSellerAboutDto,
  ProductWithSellerDto,
  PublicProductDto,
  PublicSellerDto,
  StoreProductsQuery,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  products,
  sellerDocuments,
  sellerOwners,
  sellerProfiles,
  sellers,
  type Seller,
} from '../../db/schema.js';
import {
  toCompanyProfilePublicDto,
  toPublicDocumentDto,
  toPublicProductDto,
  toPublicSellerDto,
  toSellerCardDto,
  toSellerOwnerDto,
} from '../../common/mappers.js';

export interface StoreProductsResult {
  items: PublicProductDto[];
  page: number;
  pageSize: number;
  total: number;
  /** Published listings per type, ignoring the `type` filter (drives the tabs). */
  counts: Partial<Record<ListingType, number>>;
}

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

  /** Company details + people for the public About page. */
  async getAbout(slug: string): Promise<PublicSellerAboutDto> {
    const seller = await this.requireActiveSeller(slug);
    const [[profile], owners, verifiedDocs] = await Promise.all([
      this.db.select().from(sellerProfiles).where(eq(sellerProfiles.sellerId, seller.id)).limit(1),
      this.db
        .select()
        .from(sellerOwners)
        .where(eq(sellerOwners.sellerId, seller.id))
        .orderBy(asc(sellerOwners.sortOrder), asc(sellerOwners.createdAt)),
      this.db
        .select()
        .from(sellerDocuments)
        .where(and(eq(sellerDocuments.sellerId, seller.id), eq(sellerDocuments.status, 'verified')))
        .orderBy(asc(sellerDocuments.kind)),
    ]);
    return {
      seller: toPublicSellerDto(seller),
      company: toCompanyProfilePublicDto(profile, seller),
      owners: owners.map(toSellerOwnerDto),
      trust: {
        isVerified: seller.isVerified,
        verifiedAt: seller.verifiedAt ? seller.verifiedAt.toISOString() : null,
        verifiedKinds: [...new Set(verifiedDocs.map((d) => d.kind))],
        publicDocuments: verifiedDocs.filter((d) => d.isPublic).map(toPublicDocumentDto),
      },
    };
  }

  /** Paginated, filterable catalogue of a store. */
  async getProducts(slug: string, query: StoreProductsQuery): Promise<StoreProductsResult> {
    const seller = await this.requireActiveSeller(slug);

    const base: SQL[] = [eq(products.sellerId, seller.id), eq(products.isPublished, true)];
    if (query.q) {
      const pattern = `%${query.q}%`;
      const textMatch = or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        sql`${products.specs}::text ILIKE ${pattern}`,
      );
      if (textMatch) base.push(textMatch);
    }
    const whereWithoutType = and(...base);
    const where = query.type ? and(whereWithoutType, eq(products.listingType, query.type)) : whereWithoutType;

    // Price sorts push "price on request" / unpriced items to the end.
    const orderBy =
      query.sort === 'price_asc'
        ? [sql`${products.priceRetail} ASC NULLS LAST`, desc(products.updatedAt)]
        : query.sort === 'price_desc'
          ? [sql`${products.priceRetail} DESC NULLS LAST`, desc(products.updatedAt)]
          : [desc(products.updatedAt), asc(products.name)];

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(where)
        .orderBy(...orderBy)
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db
        .select({ listingType: products.listingType, total: count() })
        .from(products)
        .where(whereWithoutType)
        .groupBy(products.listingType),
    ]);

    const counts: Partial<Record<ListingType, number>> = {};
    for (const row of countRows) counts[row.listingType] = row.total;
    const total = query.type
      ? (counts[query.type] ?? 0)
      : countRows.reduce((sum, row) => sum + row.total, 0);

    return {
      items: rows.map(toPublicProductDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
      counts,
    };
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
