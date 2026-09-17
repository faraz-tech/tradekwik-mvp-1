import { z } from "zod";
import { STOCK_STATUSES } from "../constants.js";
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
