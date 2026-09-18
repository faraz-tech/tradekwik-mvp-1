import { z } from "zod";
import { sellerTrustSchema } from "./verification.js";
import {
  REGISTRATION_TYPES,
  SELLER_KINDS,
  SELLER_STATUSES,
  SOCIAL_PLATFORMS,
  TEAM_SIZE_RANGES,
} from "../constants.js";

/** Public seller/store profile DTO — GET /sellers/:slug */
export const publicSellerSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  businessName: z.string(),
  categoryId: z.uuid(),
  sellerKind: z.enum(SELLER_KINDS),
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
  foundedYear: z.number().int().nullable(),
  teamSizeRange: z.enum(TEAM_SIZE_RANGES).nullable(),
  createdAt: z.iso.datetime(),
});

export type PublicSellerDto = z.infer<typeof publicSellerSchema>;

/** Compact seller card shown on product pages / search results. */
export const sellerCardSchema = publicSellerSchema.pick({
  slug: true,
  businessName: true,
  sellerKind: true,
  city: true,
  state: true,
  isVerified: true,
  whatsappNumber: true,
  phone: true,
  logoUrl: true,
});

export type SellerCardDto = z.infer<typeof sellerCardSchema>;

// ---------- company profile (About page) ----------

export const processStepSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  mediaUrl: z.string().trim().max(1000).optional(),
});

export const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.url("Enter a full URL starting with https://").max(500),
});

export const sellerVideoSchema = z.object({
  url: z.url("Enter a full YouTube URL").max(500),
  title: z.string().trim().max(150).optional(),
});

/** Company details shown on the store's About page (public). */
export const sellerCompanyProfileSchema = z.object({
  legalName: z.string().nullable(),
  registrationType: z.enum(REGISTRATION_TYPES).nullable(),
  registrationYear: z.number().int().nullable(),
  udyamNumber: z.string().nullable(),
  /** GSTIN, masked for anonymous buyers (e.g. 24ABCDE****F1Z5). */
  gstinMasked: z.string().nullable(),
  capacityNote: z.string().nullable(),
  leadTimeNote: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  returnPolicy: z.string().nullable(),
  processSteps: z.array(processStepSchema),
  socialLinks: z.array(socialLinkSchema),
  videos: z.array(sellerVideoSchema),
  premisesPhotos: z.array(z.object({ url: z.string(), alt: z.string().optional() })),
});
export type SellerCompanyProfileDto = z.infer<typeof sellerCompanyProfileSchema>;

/** A person behind the business. */
export const sellerOwnerSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  designation: z.string().nullable(),
  photoUrl: z.string().nullable(),
  bio: z.string().nullable(),
  yearsExperience: z.number().int().nullable(),
  languages: z.array(z.string()),
  isPrimary: z.boolean(),
  sortOrder: z.number().int(),
});
export type SellerOwnerDto = z.infer<typeof sellerOwnerSchema>;

/** GET /sellers/:slug/about — everything the public About page needs. */
export const publicSellerAboutSchema = z.object({
  seller: publicSellerSchema,
  company: sellerCompanyProfileSchema,
  owners: z.array(sellerOwnerSchema),
  trust: sellerTrustSchema,
});
export type PublicSellerAboutDto = z.infer<typeof publicSellerAboutSchema>;
