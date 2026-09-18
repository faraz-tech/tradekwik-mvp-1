import { z } from "zod";
import {
  BUYER_DOCUMENT_KINDS,
  BUYER_VERIFICATION_STATUSES,
  DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  SELLER_KINDS,
} from "../constants.js";

// ---------- documents (shared shape for sellers and buyers) ----------

export const documentSchema = z.object({
  id: z.uuid(),
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string(),
  fileUrl: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  isPublic: z.boolean(),
  issuedOn: z.string().nullable(),
  expiresOn: z.string().nullable(),
  status: z.enum(DOCUMENT_STATUSES),
  reviewedAt: z.iso.datetime().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type DocumentDto = z.infer<typeof documentSchema>;

export const createDocumentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string().trim().min(2).max(150),
  fileUrl: z.string().url().max(1000),
  mimeType: z.string().max(100),
  sizeBytes: z.coerce.number().int().min(0),
  isPublic: z.boolean().default(false),
  issuedOn: z.iso.date().nullable().optional(),
  expiresOn: z.iso.date().nullable().optional(),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const createBuyerDocumentSchema = createDocumentSchema.extend({
  kind: z.enum(BUYER_DOCUMENT_KINDS),
});
export type CreateBuyerDocumentInput = z.infer<typeof createBuyerDocumentSchema>;

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(2).max(150).optional(),
    isPublic: z.boolean().optional(),
    expiresOn: z.iso.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// ---------- seller checklist ----------

export const checklistItemSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  required: z.boolean(),
  /** Best document of this kind, if uploaded. */
  document: documentSchema.nullable(),
});
export type ChecklistItemDto = z.infer<typeof checklistItemSchema>;

/** GET /seller/documents — checklist + all uploads + current badge state. */
export const sellerVerificationSchema = z.object({
  sellerKind: z.enum(SELLER_KINDS),
  isVerified: z.boolean(),
  verifiedAt: z.iso.datetime().nullable(),
  /** Required documents still missing or rejected. */
  missingRequired: z.array(z.enum(DOCUMENT_KINDS)),
  pendingReview: z.number().int(),
  checklist: z.array(checklistItemSchema),
  documents: z.array(documentSchema),
});
export type SellerVerificationDto = z.infer<typeof sellerVerificationSchema>;

// ---------- public (About page) ----------

export const publicDocumentSchema = z.object({
  id: z.uuid(),
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string(),
  fileUrl: z.string(),
  mimeType: z.string(),
  issuedOn: z.string().nullable(),
});
export type PublicDocumentDto = z.infer<typeof publicDocumentSchema>;

/** Trust summary shown on the storefront. */
export const sellerTrustSchema = z.object({
  isVerified: z.boolean(),
  verifiedAt: z.iso.datetime().nullable(),
  /** Document kinds that a TradeKwik verifier has approved (e.g. gst_certificate, iso). */
  verifiedKinds: z.array(z.enum(DOCUMENT_KINDS)),
  /** Approved documents the seller chose to publish (brochures, certificates). */
  publicDocuments: z.array(publicDocumentSchema),
});
export type SellerTrustDto = z.infer<typeof sellerTrustSchema>;

// ---------- buyer verification ----------

export const buyerVerificationSchema = z.object({
  status: z.enum(BUYER_VERIFICATION_STATUSES),
  requestedAt: z.iso.datetime().nullable(),
  reviewNote: z.string().nullable(),
  /** What is still needed before a review can be requested. */
  missing: z.array(z.string()),
  documents: z.array(documentSchema),
});
export type BuyerVerificationDto = z.infer<typeof buyerVerificationSchema>;

// ---------- admin review ----------

export const reviewDocumentSchema = z
  .object({
    status: z.enum(["verified", "rejected"]),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.status !== "rejected" || Boolean(d.rejectionReason?.trim()), {
    message: "Give a reason when rejecting",
    path: ["rejectionReason"],
  });
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;

export const adminSellerVerificationSchema = z.object({
  sellerId: z.uuid(),
  businessName: z.string(),
  slug: z.string(),
  sellerKind: z.enum(SELLER_KINDS),
  isVerified: z.boolean(),
  pendingCount: z.number().int(),
  missingRequired: z.array(z.enum(DOCUMENT_KINDS)),
  expiringSoon: z.number().int(),
  documents: z.array(documentSchema),
});
export type AdminSellerVerificationDto = z.infer<typeof adminSellerVerificationSchema>;

export const adminBuyerVerificationSchema = z.object({
  buyerId: z.uuid(),
  fullName: z.string(),
  phone: z.string(),
  companyName: z.string().nullable(),
  gstin: z.string().nullable(),
  city: z.string().nullable(),
  status: z.enum(BUYER_VERIFICATION_STATUSES),
  requestedAt: z.iso.datetime().nullable(),
  documents: z.array(documentSchema),
});
export type AdminBuyerVerificationDto = z.infer<typeof adminBuyerVerificationSchema>;

/** GET /admin/verification/queue */
export const verificationQueueSchema = z.object({
  sellers: z.array(adminSellerVerificationSchema),
  buyers: z.array(adminBuyerVerificationSchema),
});
export type VerificationQueueDto = z.infer<typeof verificationQueueSchema>;

export const reviewBuyerSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});
export type ReviewBuyerInput = z.infer<typeof reviewBuyerSchema>;
