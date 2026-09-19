import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type {
  ListingType,
  SellerContactDto,
  PublicSellerAboutDto,
  SellerDirectoryMeta,
  SellerDirectoryQuery,
  SellerListItemDto,
  ProductWithSellerDto,
  PublicProductDto,
  PublicSellerDto,
  StoreProductsQuery,
} from '@tradekwik/shared';
import { PLAN_DEFINITIONS } from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  categories,
  products,
  sellerDocuments,
  sellerOwners,
  sellerProfiles,
  sellers,
  subscriptionGrants,
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

  /** Trial still running, or at least one paid period covering now. */
  private static readonly SUBSCRIPTION_LIVE = sql`(
    ${sellers.trialEndsAt} > now()
    or exists (
      select 1 from ${subscriptionGrants}
      where ${subscriptionGrants.sellerId} = ${sellers.id}
        and ${subscriptionGrants.startsAt} <= now()
        and ${subscriptionGrants.endsAt} > now()
    )
  )`;

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

  /** Public seller directory with filters, featured-first ordering and pagination. */
  async directory(
    query: SellerDirectoryQuery,
  ): Promise<{ items: SellerListItemDto[]; meta: SellerDirectoryMeta }> {
    // A seller is listed only while the account is active AND the trial or a paid plan is live.
    // Expired sellers keep their store URL (buyers with a link still reach it) but drop off the directory.
    const conditions: SQL[] = [eq(sellers.status, 'active'), SellersService.SUBSCRIPTION_LIVE];
    if (query.kind) conditions.push(eq(sellers.sellerKind, query.kind));
    if (query.state) conditions.push(ilike(sellers.state, query.state));
    if (query.verified) conditions.push(eq(sellers.isVerified, true));
    if (query.category) conditions.push(eq(categories.slug, query.category));
    if (query.q) {
      const pattern = `%${query.q}%`;
      const match = or(
        ilike(sellers.businessName, pattern),
        ilike(sellers.description, pattern),
        ilike(sellers.city, pattern),
      );
      if (match) conditions.push(match);
    }
    const where = and(...conditions);

    const base = this.db
      .select({
        seller: sellers,
        productCount: sql<number>`(
          select count(*)::int from ${products}
          where ${products.sellerId} = ${sellers.id} and ${products.isPublished} = true
        )`,
      })
      .from(sellers)
      .innerJoin(categories, eq(sellers.categoryId, categories.id))
      .where(where);

    const [rows, [{ total }], stateRows] = await Promise.all([
      query.sort === 'name'
        ? base.orderBy(asc(sellers.businessName)).limit(query.pageSize).offset((query.page - 1) * query.pageSize)
        : query.sort === 'newest'
          ? base.orderBy(desc(sellers.createdAt)).limit(query.pageSize).offset((query.page - 1) * query.pageSize)
          : base
              // featured: verified first, then newest — the plan flag is layered on below
              .orderBy(desc(sellers.isVerified), desc(sellers.createdAt))
              .limit(query.pageSize)
              .offset((query.page - 1) * query.pageSize),
      this.db
        .select({ total: count() })
        .from(sellers)
        .innerJoin(categories, eq(sellers.categoryId, categories.id))
        .where(where),
      this.db
        .selectDistinct({ state: sellers.state })
        .from(sellers)
        .where(and(eq(sellers.status, 'active'), SellersService.SUBSCRIPTION_LIVE))
        .orderBy(asc(sellers.state)),
    ]);

    const featured = await this.featuredSellerIds(rows.map((r) => r.seller.id));
    const items = rows.map(({ seller, productCount }) => ({
      ...toPublicSellerDto(seller),
      productCount,
      isFeatured: featured.has(seller.id),
    }));
    if (query.sort === 'featured') {
      items.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }

    return {
      items,
      meta: { page: query.page, pageSize: query.pageSize, total, states: stateRows.map((r) => r.state) },
    };
  }

  /** Sellers whose active plan (or running trial) includes featured placement. */
  private async featuredSellerIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const now = new Date();
    const [grants, trials] = await Promise.all([
      this.db
        .select({ sellerId: subscriptionGrants.sellerId, plan: subscriptionGrants.plan })
        .from(subscriptionGrants)
        .where(and(inArray(subscriptionGrants.sellerId, ids), gt(subscriptionGrants.endsAt, now))),
      this.db
        .select({ id: sellers.id })
        .from(sellers)
        .where(and(inArray(sellers.id, ids), gt(sellers.trialEndsAt, now))),
    ]);
    const featured = new Set<string>(trials.map((t) => t.id)); // trial = full access
    for (const g of grants) {
      if (PLAN_DEFINITIONS[g.plan].limits.featured) featured.add(g.sellerId);
    }
    return featured;
  }

  /** Real contact numbers — buyers only, never in a public/ISR-cached response. */
  async getContact(slug: string): Promise<SellerContactDto> {
    const seller = await this.requireActiveSeller(slug);
    return {
      businessName: seller.businessName,
      phone: seller.phone,
      whatsappNumber: seller.whatsappNumber,
    };
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
