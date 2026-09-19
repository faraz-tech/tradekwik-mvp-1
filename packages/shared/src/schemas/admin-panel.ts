import { z } from "zod";
import { SELLER_KINDS, SELLER_STATUSES } from "../constants.js";
import { PLANS, SUBSCRIPTION_STATES } from "./billing.js";
import { indianPhoneSchema } from "./common.js";
import { sellerInquirySchema } from "./seller-panel.js";
import { sellerProfileSchema } from "./seller-panel.js";

/** Seller as the platform admin sees it (includes owner contact). */
export const adminSellerSchema = sellerProfileSchema.extend({
  ownerName: z.string().nullable(),
  ownerPhone: z.string().nullable(),
  productCount: z.number().int(),
  subscription: z.object({
    state: z.enum(SUBSCRIPTION_STATES),
    effectivePlan: z.enum(PLANS).nullable(),
    currentPeriodEndsAt: z.iso.datetime().nullable(),
  }),
});
export type AdminSellerDto = z.infer<typeof adminSellerSchema>;

/** POST /admin/sellers — onboard a seller with their first login user. */
export const createSellerSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(200)
    .optional(),
  categoryId: z.uuid(),
  sellerKind: z.enum(SELLER_KINDS).default("retailer"),
  description: z.string().trim().max(5000).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  address: z.string().trim().max(500).optional(),
  phone: indianPhoneSchema,
  whatsappNumber: indianPhoneSchema,
  email: z.email().optional(),
  gstNumber: z.string().trim().max(20).optional(),
  servesPanIndia: z.boolean().default(false),
  deliveryRadiusKm: z.coerce.number().int().min(1).max(10000).optional(),
  /** activate immediately, or leave pending for later approval */
  status: z.enum(SELLER_STATUSES).default("pending"),
  owner: z.object({
    name: z.string().trim().min(2).max(100),
    phone: indianPhoneSchema,
    email: z.email().optional(),
    password: z.string().min(6, "Password must be at least 6 characters").max(100),
  }),
});
export type CreateSellerInput = z.infer<typeof createSellerSchema>;

/** PATCH /admin/sellers/:id — approve / verify / suspend. */
export const adminUpdateSellerSchema = z
  .object({
    status: z.enum(SELLER_STATUSES).optional(),
    isVerified: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
export type AdminUpdateSellerInput = z.infer<typeof adminUpdateSellerSchema>;

export const adminSellerListQuerySchema = z.object({
  status: z.enum(SELLER_STATUSES).optional(),
});

/** Inquiry with its seller, for the platform-wide list. */
export const adminInquirySchema = sellerInquirySchema.extend({
  sellerName: z.string(),
  sellerSlug: z.string(),
});
export type AdminInquiryDto = z.infer<typeof adminInquirySchema>;

/** GET /admin/overview — platform stats. */
export const platformOverviewSchema = z.object({
  sellers: z.object({
    total: z.number().int(),
    active: z.number().int(),
    pending: z.number().int(),
    suspended: z.number().int(),
  }),
  products: z.object({ total: z.number().int(), published: z.number().int() }),
  inquiries: z.object({ total: z.number().int(), last7Days: z.number().int() }),
  orderRequests: z.object({ total: z.number().int(), last7Days: z.number().int() }),
});
export type PlatformOverviewDto = z.infer<typeof platformOverviewSchema>;
