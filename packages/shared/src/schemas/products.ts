import { z } from "zod";
import { LISTING_TYPES, STOCK_STATUSES } from "../constants.js";
import { sellerCardSchema } from "./sellers.js";

export const productMediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string(),
  alt: z.string().optional(),
});

/** Public product DTO — GET /sellers/:slug/products[/:productSlug] */
export const publicProductSchema = z.object({
  id: z.uuid(),
  sellerId: z.uuid(),
  categoryId: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  specs: z.record(z.string(), z.string()),
  priceRetail: z.number().nullable(),
  priceBulk: z.number().nullable(),
  minBulkQty: z.number().int().nullable(),
  priceOnRequest: z.boolean(),
  stockStatus: z.enum(STOCK_STATUSES),
  listingType: z.enum(LISTING_TYPES),
  media: z.array(productMediaItemSchema),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});

export type PublicProductDto = z.infer<typeof publicProductSchema>;

/** Product with its seller card — search results & product detail page. */
export const productWithSellerSchema = publicProductSchema.extend({
  seller: sellerCardSchema,
});

export type ProductWithSellerDto = z.infer<typeof productWithSellerSchema>;

/** Query params for GET /products (search/browse). */
export const productSearchQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;

/** Sort options for a store's catalogue. */
export const STORE_SORTS = ["newest", "price_asc", "price_desc"] as const;
export type StoreSort = (typeof STORE_SORTS)[number];

/** Query params for GET /sellers/:slug/products (store catalogue). */
export const storeProductsQuerySchema = z.object({
  type: z.enum(LISTING_TYPES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(STORE_SORTS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export type StoreProductsQuery = z.infer<typeof storeProductsQuerySchema>;

/** Pagination meta for a store catalogue, incl. per-type counts for the tabs. */
export const storeProductsMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  counts: z.partialRecord(z.enum(LISTING_TYPES), z.number().int()),
});

export type StoreProductsMeta = z.infer<typeof storeProductsMetaSchema>;
