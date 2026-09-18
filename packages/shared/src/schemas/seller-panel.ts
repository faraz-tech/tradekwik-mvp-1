import { z } from "zod";
import {
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  ORDER_REQUEST_STATUSES,
  ORDER_TYPES,
  BUYER_TYPES,
  LISTING_TYPES,
  STOCK_STATUSES,
} from "../constants.js";
import { indianPhoneSchema } from "./common.js";
import { productMediaItemSchema, publicProductSchema } from "./products.js";
import { publicSellerSchema } from "./sellers.js";

// ---------- products ----------

/** Full product as the owning seller sees it (includes unpublished state). */
export const sellerProductSchema = publicProductSchema.extend({
  isPublished: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type SellerProductDto = z.infer<typeof sellerProductSchema>;

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(200)
    .optional(),
  categoryId: z.uuid(),
  description: z.string().trim().max(5000).optional(),
  specs: z.record(z.string().min(1).max(100), z.string().min(1).max(500)).default({}),
  priceRetail: z.coerce.number().min(0).max(100000000).optional(),
  priceBulk: z.coerce.number().min(0).max(100000000).optional(),
  minBulkQty: z.coerce.number().int().min(1).max(1000000).optional(),
  priceOnRequest: z.boolean().default(false),
  stockStatus: z.enum(STOCK_STATUSES).default("in_stock"),
  listingType: z.enum(LISTING_TYPES).default("product"),
  media: z.array(productMediaItemSchema).max(12).default([]),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().trim().max(200).optional(),
  seoDescription: z.string().trim().max(300).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ---------- inquiries ----------

/** Full inquiry as the seller sees it. */
export const sellerInquirySchema = z.object({
  id: z.uuid(),
  productId: z.uuid().nullable(),
  productName: z.string().nullable(),
  buyerName: z.string(),
  buyerPhone: z.string(),
  buyerCity: z.string().nullable(),
  buyerType: z.enum(BUYER_TYPES),
  quantity: z.number().int().nullable(),
  message: z.string(),
  source: z.enum(INQUIRY_SOURCES),
  status: z.enum(INQUIRY_STATUSES),
  sellerNotes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type SellerInquiryDto = z.infer<typeof sellerInquirySchema>;

export const updateInquirySchema = z
  .object({
    status: z.enum(INQUIRY_STATUSES).optional(),
    sellerNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;

// ---------- order requests ----------

export const orderItemSchema = z.object({
  productId: z.uuid().optional(),
  name: z.string(),
  qty: z.number().int(),
  notes: z.string().optional(),
});

export const sellerOrderRequestSchema = z.object({
  id: z.uuid(),
  buyerName: z.string(),
  buyerPhone: z.string(),
  deliveryAddress: z.string(),
  orderType: z.enum(ORDER_TYPES),
  eventDate: z.string().nullable(),
  items: z.array(orderItemSchema),
  status: z.enum(ORDER_REQUEST_STATUSES),
  sellerNotes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type SellerOrderRequestDto = z.infer<typeof sellerOrderRequestSchema>;

export const updateOrderRequestSchema = z
  .object({
    status: z.enum(ORDER_REQUEST_STATUSES).optional(),
    sellerNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
export type UpdateOrderRequestInput = z.infer<typeof updateOrderRequestSchema>;

// ---------- profile ----------

export const updateSellerProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  city: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone: indianPhoneSchema.optional(),
  whatsappNumber: indianPhoneSchema.optional(),
  email: z.email().nullable().optional(),
  logoUrl: z.string().max(1000).nullable().optional(),
  coverImageUrl: z.string().max(1000).nullable().optional(),
  gstNumber: z.string().trim().max(20).nullable().optional(),
  servesPanIndia: z.boolean().optional(),
  deliveryRadiusKm: z.coerce.number().int().min(1).max(10000).nullable().optional(),
});
export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>;

/** Seller's own profile = public profile + private fields. */
export const sellerProfileSchema = publicSellerSchema.extend({
  gstNumber: z.string().nullable(),
});
export type SellerProfileDto = z.infer<typeof sellerProfileSchema>;

// ---------- dashboard ----------

export const sellerDashboardSchema = z.object({
  newInquiries: z.number().int(),
  newOrders: z.number().int(),
  publishedProducts: z.number().int(),
  totalProducts: z.number().int(),
  /** Last 7 days, oldest first, zero-filled. */
  inquiryTrend: z.array(z.object({ date: z.string(), count: z.number().int() })),
});
export type SellerDashboardDto = z.infer<typeof sellerDashboardSchema>;

// ---------- query params ----------

export const inquiryListQuerySchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
});
export const orderListQuerySchema = z.object({
  status: z.enum(ORDER_REQUEST_STATUSES).optional(),
});

// ---------- uploads ----------

export const uploadResponseSchema = z.object({ url: z.string() });
export type UploadResponseDto = z.infer<typeof uploadResponseSchema>;
