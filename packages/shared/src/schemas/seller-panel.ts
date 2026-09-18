import { z } from "zod";
import {
  BUYER_TYPES,
  BUYER_VERIFICATION_STATUSES,
  FREIGHT_TERMS,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  LISTING_TYPES,
  ORDER_ACTOR_TYPES,
  ORDER_REQUEST_STATUSES,
  ORDER_TYPES,
  REGISTRATION_TYPES,
  SELLER_KINDS,
  SELLER_USER_ROLES,
  SHIPMENT_STATUSES,
  STOCK_STATUSES,
  TEAM_SIZE_RANGES,
} from "../constants.js";
import { indianPhoneSchema } from "./common.js";
import { priceTierSchema, productMediaItemSchema, publicProductSchema } from "./products.js";
import {
  processStepSchema,
  publicSellerSchema,
  sellerCardSchema,
  sellerOwnerSchema,
  sellerVideoSchema,
  socialLinkSchema,
} from "./sellers.js";

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
  priceTiers: z.array(priceTierSchema).max(6).default([]),
  wholesaleOnly: z.boolean().default(false),
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
  buyerId: z.uuid().nullable(),
  buyerVerificationStatus: z.enum(BUYER_VERIFICATION_STATUSES).nullable(),
  buyerName: z.string(),
  buyerPhone: z.string(),
  buyerCity: z.string().nullable(),
  buyerType: z.enum(BUYER_TYPES),
  quantity: z.number().int().nullable(),
  message: z.string(),
  source: z.enum(INQUIRY_SOURCES),
  status: z.enum(INQUIRY_STATUSES),
  sellerNotes: z.string().nullable(),
  /** Set when the seller converted this inquiry into an order. */
  orderId: z.uuid().nullable(),
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
  unitPrice: z.number().optional(),
});

export const orderItemUpdateSchema = z.object({
  productId: z.uuid().optional(),
  name: z.string().trim().min(1).max(200),
  qty: z.coerce.number().int().min(1).max(100000),
  notes: z.string().trim().max(500).optional(),
  unitPrice: z.coerce.number().min(0).max(100000000).optional(),
});

/** One entry in an order's history (who did what, when). */
export const orderEventSchema = z.object({
  id: z.uuid(),
  status: z.enum(ORDER_REQUEST_STATUSES).nullable(),
  actorType: z.enum(ORDER_ACTOR_TYPES),
  actorName: z.string().nullable(),
  note: z.string().nullable(),
  visibleToBuyer: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type OrderEventDto = z.infer<typeof orderEventSchema>;

/** Transport details — the "bilty" (LR / lorry receipt) the seller gets from the transporter. */
export const shipmentSchema = z.object({
  id: z.uuid(),
  status: z.enum(SHIPMENT_STATUSES),
  transportName: z.string(),
  transportPhone: z.string().nullable(),
  transportBranch: z.string().nullable(),
  lrNumber: z.string(),
  lrDocumentUrl: z.string().nullable(),
  vehicleNumber: z.string().nullable(),
  driverPhone: z.string().nullable(),
  packagesCount: z.number().int().nullable(),
  dispatchedAt: z.iso.datetime().nullable(),
  expectedDeliveryOn: z.string().nullable(),
  deliveredAt: z.iso.datetime().nullable(),
  notes: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});
export type ShipmentDto = z.infer<typeof shipmentSchema>;

export const upsertShipmentSchema = z.object({
  transportName: z.string().trim().min(2, "Enter the transport company name").max(150),
  transportPhone: indianPhoneSchema.nullable().optional(),
  transportBranch: z.string().trim().max(150).nullable().optional(),
  lrNumber: z.string().trim().min(1, "Enter the LR / bilty number").max(60),
  lrDocumentUrl: z.string().trim().max(1000).nullable().optional(),
  vehicleNumber: z.string().trim().max(20).nullable().optional(),
  driverPhone: indianPhoneSchema.nullable().optional(),
  packagesCount: z.coerce.number().int().min(1).max(100000).nullable().optional(),
  dispatchedAt: z.iso.datetime().nullable().optional(),
  expectedDeliveryOn: z.iso.date().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(SHIPMENT_STATUSES).default("booked"),
});
export type UpsertShipmentInput = z.infer<typeof upsertShipmentSchema>;

export const sellerOrderRequestSchema = z.object({
  id: z.uuid(),
  orderNumber: z.string(),
  buyerId: z.uuid().nullable(),
  inquiryId: z.uuid().nullable(),
  buyerName: z.string(),
  buyerPhone: z.string(),
  deliveryAddress: z.string(),
  orderType: z.enum(ORDER_TYPES),
  eventDate: z.string().nullable(),
  items: z.array(orderItemSchema),
  status: z.enum(ORDER_REQUEST_STATUSES),
  transportPreference: z.string().nullable(),
  freightTerm: z.enum(FREIGHT_TERMS).nullable(),
  buyerNotes: z.string().nullable(),
  quotedAmount: z.number().nullable(),
  agreedAmount: z.number().nullable(),
  expectedDeliveryOn: z.string().nullable(),
  sellerNotes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type SellerOrderRequestDto = z.infer<typeof sellerOrderRequestSchema>;

export const sellerOrderDetailSchema = sellerOrderRequestSchema.extend({
  events: z.array(orderEventSchema),
  shipment: shipmentSchema.nullable(),
});
export type SellerOrderDetailDto = z.infer<typeof sellerOrderDetailSchema>;

export const updateOrderRequestSchema = z
  .object({
    status: z.enum(ORDER_REQUEST_STATUSES).optional(),
    sellerNotes: z.string().trim().max(2000).nullable().optional(),
    quotedAmount: z.coerce.number().min(0).max(1000000000).nullable().optional(),
    agreedAmount: z.coerce.number().min(0).max(1000000000).nullable().optional(),
    expectedDeliveryOn: z.iso.date().nullable().optional(),
    freightTerm: z.enum(FREIGHT_TERMS).nullable().optional(),
    items: z.array(orderItemUpdateSchema).min(1).max(20).optional(),
    /** Message shown to the buyer on their order timeline. */
    buyerMessage: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
export type UpdateOrderRequestInput = z.infer<typeof updateOrderRequestSchema>;

/** POST /seller/inquiries/:id/convert — turn an inquiry into an order request. */
export const convertInquirySchema = z.object({
  orderType: z.enum(ORDER_TYPES).default("bulk"),
  items: z.array(orderItemUpdateSchema).min(1, "Add at least one item").max(20),
  deliveryAddress: z.string().trim().min(5, "Enter the delivery address").max(500),
  quotedAmount: z.coerce.number().min(0).max(1000000000).optional(),
  expectedDeliveryOn: z.iso.date().optional(),
  freightTerm: z.enum(FREIGHT_TERMS).optional(),
  buyerMessage: z.string().trim().max(1000).optional(),
});
export type ConvertInquiryInput = z.infer<typeof convertInquirySchema>;

// ---------- profile ----------

export const updateSellerProfileSchema = z.object({
  businessName: z.string().trim().min(2).max(200).optional(),
  sellerKind: z.enum(SELLER_KINDS).optional(),
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
  foundedYear: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  teamSizeRange: z.enum(TEAM_SIZE_RANGES).nullable().optional(),
});
export type UpdateSellerProfileInput = z.infer<typeof updateSellerProfileSchema>;

/** Seller's own profile = public profile + private fields. */
export const sellerProfileSchema = publicSellerSchema.extend({
  gstNumber: z.string().nullable(),
});
export type SellerProfileDto = z.infer<typeof sellerProfileSchema>;

// ---------- company profile (About page content) ----------

export const sellerCompanyProfileInputSchema = z.object({
  legalName: z.string().trim().max(200).nullable().optional(),
  registrationType: z.enum(REGISTRATION_TYPES).nullable().optional(),
  registrationYear: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  udyamNumber: z.string().trim().max(30).nullable().optional(),
  capacityNote: z.string().trim().max(1000).nullable().optional(),
  leadTimeNote: z.string().trim().max(1000).nullable().optional(),
  paymentTerms: z.string().trim().max(1000).nullable().optional(),
  returnPolicy: z.string().trim().max(2000).nullable().optional(),
  processSteps: z.array(processStepSchema).max(12).optional(),
  socialLinks: z.array(socialLinkSchema).max(12).optional(),
  videos: z.array(sellerVideoSchema).max(12).optional(),
  premisesPhotos: z
    .array(z.object({ url: z.string().max(1000), alt: z.string().max(200).optional() }))
    .max(20)
    .optional(),
});
export type SellerCompanyProfileInput = z.infer<typeof sellerCompanyProfileInputSchema>;

/** Seller's own view of the company profile (unmasked GSTIN comes from the store profile). */
export const sellerCompanyProfileOwnSchema = z.object({
  legalName: z.string().nullable(),
  registrationType: z.enum(REGISTRATION_TYPES).nullable(),
  registrationYear: z.number().int().nullable(),
  udyamNumber: z.string().nullable(),
  capacityNote: z.string().nullable(),
  leadTimeNote: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  returnPolicy: z.string().nullable(),
  processSteps: z.array(processStepSchema),
  socialLinks: z.array(socialLinkSchema),
  videos: z.array(sellerVideoSchema),
  premisesPhotos: z.array(z.object({ url: z.string(), alt: z.string().optional() })),
});
export type SellerCompanyProfileOwnDto = z.infer<typeof sellerCompanyProfileOwnSchema>;

export const createOwnerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  designation: z.string().trim().max(100).nullable().optional(),
  photoUrl: z.string().trim().max(1000).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).nullable().optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  isPrimary: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});
export type CreateOwnerInput = z.infer<typeof createOwnerSchema>;
export const updateOwnerSchema = createOwnerSchema.partial();
export type UpdateOwnerInput = z.infer<typeof updateOwnerSchema>;
export { sellerOwnerSchema };

// ---------- team (seller users) ----------

export const sellerTeamMemberSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  role: z.enum(SELLER_USER_ROLES),
  createdAt: z.iso.datetime(),
});
export type SellerTeamMemberDto = z.infer<typeof sellerTeamMemberSchema>;

const assignableRoles = SELLER_USER_ROLES.filter((r) => r !== "owner") as [
  SellerUserRoleNoOwner,
  ...SellerUserRoleNoOwner[],
];
type SellerUserRoleNoOwner = Exclude<(typeof SELLER_USER_ROLES)[number], "owner">;

export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: indianPhoneSchema,
  email: z.email().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  role: z.enum(assignableRoles),
});
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

export const updateTeamMemberSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    role: z.enum(assignableRoles).optional(),
    password: z.string().min(6).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

// ---------- dashboard ----------

export const sellerDashboardSchema = z.object({
  newInquiries: z.number().int(),
  newOrders: z.number().int(),
  /** Orders that are confirmed but not yet delivered/completed. */
  openOrders: z.number().int(),
  publishedProducts: z.number().int(),
  totalProducts: z.number().int(),
  /** Last 7 days, oldest first, zero-filled. */
  inquiryTrend: z.array(z.object({ date: z.string(), count: z.number().int() })),
  /** First-run checklist; each flag is true when that step is done. */
  onboarding: z.object({
    storeSettings: z.boolean(),
    companyProfile: z.boolean(),
    firstProduct: z.boolean(),
    documents: z.boolean(),
    isVerified: z.boolean(),
  }),
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

// re-export for convenience in the admin app
export { sellerCardSchema };
