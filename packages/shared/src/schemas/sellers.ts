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
  /** Masked (e.g. +9198765•••••) unless the caller is a logged-in buyer. */
  phone: z.string(),
  whatsappNumber: z.string(),
  /** False when the numbers above are masked — the UI then asks the buyer to log in. */
  contactRevealed: z.boolean(),
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
  contactRevealed: true,
  logoUrl: true,
});

export type SellerCardDto = z.infer<typeof sellerCardSchema>;

/** GET /sellers/:slug/contact — real numbers, logged-in buyers only. */
export const sellerContactSchema = z.object({
  businessName: z.string(),
  phone: z.string(),
  whatsappNumber: z.string(),
});
export type SellerContactDto = z.infer<typeof sellerContactSchema>;

// ---------- public seller directory ----------

/** A seller as listed on /sellers. */
export const sellerListItemSchema = publicSellerSchema.extend({
  productCount: z.number().int(),
  /** True while the seller's plan (or trial) includes featured placement. */
  isFeatured: z.boolean(),
});
export type SellerListItemDto = z.infer<typeof sellerListItemSchema>;

export const SELLER_DIRECTORY_SORTS = ["featured", "newest", "name"] as const;
export type SellerDirectorySort = (typeof SELLER_DIRECTORY_SORTS)[number];

/** Query params for GET /sellers */
export const sellerDirectoryQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  kind: z.enum(SELLER_KINDS).optional(),
  category: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).max(100).optional(),
  verified: z.coerce.boolean().optional(),
  sort: z.enum(SELLER_DIRECTORY_SORTS).default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type SellerDirectoryQuery = z.infer<typeof sellerDirectoryQuerySchema>;

export const sellerDirectoryMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  /** States present across all active sellers, for the filter chips. */
  states: z.array(z.string()),
});
export type SellerDirectoryMeta = z.infer<typeof sellerDirectoryMetaSchema>;

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
