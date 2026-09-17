import { z } from "zod";
import { SELLER_STATUSES } from "../constants.js";

/** Public seller/store profile DTO — GET /sellers/:slug */
export const publicSellerSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  businessName: z.string(),
  categoryId: z.uuid(),
  description: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  address: z.string().nullable(),
  phone: z.string(),
  whatsappNumber: z.string(),
  email: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  isVerified: z.boolean(),
  status: z.enum(SELLER_STATUSES),
  servesPanIndia: z.boolean(),
  deliveryRadiusKm: z.number().int().nullable(),
  createdAt: z.iso.datetime(),
});

export type PublicSellerDto = z.infer<typeof publicSellerSchema>;

/** Compact seller card shown on product pages / search results. */
export const sellerCardSchema = publicSellerSchema.pick({
  slug: true,
  businessName: true,
  city: true,
  state: true,
  isVerified: true,
  whatsappNumber: true,
  phone: true,
  logoUrl: true,
});

export type SellerCardDto = z.infer<typeof sellerCardSchema>;
