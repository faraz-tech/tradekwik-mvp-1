import { z } from "zod";
import {
  BUYER_TYPES,
  BUYER_VERIFICATION_STATUSES,
  FREIGHT_TERMS,
  INQUIRY_STATUSES,
  ORDER_REQUEST_STATUSES,
  ORDER_TYPES,
} from "../constants.js";
import { orderEventSchema, orderItemSchema, shipmentSchema } from "./seller-panel.js";
import { sellerCardSchema } from "./sellers.js";

// ---------- profile ----------

export const buyerProfileSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  buyerType: z.enum(BUYER_TYPES),
  companyName: z.string().nullable(),
  gstin: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  defaultAddress: z.string().nullable(),
  verificationStatus: z.enum(BUYER_VERIFICATION_STATUSES),
  createdAt: z.iso.datetime(),
});
export type BuyerProfileDto = z.infer<typeof buyerProfileSchema>;

export const updateBuyerProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.email().nullable().optional(),
    buyerType: z.enum(BUYER_TYPES).optional(),
    companyName: z.string().trim().max(200).nullable().optional(),
    gstin: z.string().trim().max(20).nullable().optional(),
    city: z.string().trim().max(100).nullable().optional(),
    state: z.string().trim().max(100).nullable().optional(),
    defaultAddress: z.string().trim().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });
export type UpdateBuyerProfileInput = z.infer<typeof updateBuyerProfileSchema>;

// ---------- inquiries ----------

export const buyerInquirySchema = z.object({
  id: z.uuid(),
  seller: sellerCardSchema,
  productId: z.uuid().nullable(),
  productName: z.string().nullable(),
  productSlug: z.string().nullable(),
  quantity: z.number().int().nullable(),
  message: z.string(),
  status: z.enum(INQUIRY_STATUSES),
  /** Set when the seller turned this inquiry into an order. */
  orderId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});
export type BuyerInquiryDto = z.infer<typeof buyerInquirySchema>;

// ---------- orders ----------

export const buyerOrderSchema = z.object({
  id: z.uuid(),
  orderNumber: z.string(),
  seller: sellerCardSchema,
  orderType: z.enum(ORDER_TYPES),
  eventDate: z.string().nullable(),
  items: z.array(orderItemSchema),
  status: z.enum(ORDER_REQUEST_STATUSES),
  deliveryAddress: z.string(),
  transportPreference: z.string().nullable(),
  freightTerm: z.enum(FREIGHT_TERMS).nullable(),
  buyerNotes: z.string().nullable(),
  quotedAmount: z.number().nullable(),
  agreedAmount: z.number().nullable(),
  expectedDeliveryOn: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type BuyerOrderDto = z.infer<typeof buyerOrderSchema>;

export const buyerOrderDetailSchema = buyerOrderSchema.extend({
  /** Only events the seller marked visible to the buyer, plus the buyer's own. */
  events: z.array(orderEventSchema),
  shipment: shipmentSchema.nullable(),
});
export type BuyerOrderDetailDto = z.infer<typeof buyerOrderDetailSchema>;

/** POST /buyer/orders/:id/actions */
export const buyerOrderActionSchema = z.object({
  action: z.enum(["confirm_received", "cancel", "message"]),
  note: z.string().trim().max(1000).optional(),
});
export type BuyerOrderActionInput = z.infer<typeof buyerOrderActionSchema>;

// ---------- dashboard ----------

export const buyerDashboardSchema = z.object({
  openInquiries: z.number().int(),
  activeOrders: z.number().int(),
  inTransit: z.number().int(),
  completedOrders: z.number().int(),
  recentOrders: z.array(buyerOrderSchema),
});
export type BuyerDashboardDto = z.infer<typeof buyerDashboardSchema>;
