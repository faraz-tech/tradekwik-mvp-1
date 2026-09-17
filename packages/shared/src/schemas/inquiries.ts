import { z } from "zod";
import { BUYER_TYPES, INQUIRY_SOURCES, ORDER_TYPES } from "../constants.js";
import { indianPhoneSchema } from "./common.js";

/** POST /inquiries — public inquiry form. */
export const createInquirySchema = z.object({
  sellerId: z.uuid(),
  productId: z.uuid().optional(),
  buyerName: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(100, "Name is too long"),
  buyerPhone: indianPhoneSchema,
  buyerCity: z.string().trim().max(100).optional(),
  buyerType: z.enum(BUYER_TYPES),
  quantity: z.coerce.number().int().min(1).max(100000).optional(),
  message: z
    .string()
    .trim()
    .min(5, "Please write a short message")
    .max(2000, "Message is too long"),
  source: z.enum(INQUIRY_SOURCES),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

export const orderItemInputSchema = z.object({
  productId: z.uuid().optional(),
  name: z.string().trim().min(1).max(200),
  qty: z.coerce.number().int().min(1, "Quantity must be at least 1").max(100000),
  notes: z.string().trim().max(500).optional(),
});

/** POST /order-requests — public order/booking form. */
export const createOrderRequestSchema = z
  .object({
    sellerId: z.uuid(),
    buyerName: z
      .string()
      .trim()
      .min(2, "Please enter your name")
      .max(100, "Name is too long"),
    buyerPhone: indianPhoneSchema,
    deliveryAddress: z
      .string()
      .trim()
      .min(10, "Please enter the full delivery address")
      .max(500, "Address is too long"),
    orderType: z.enum(ORDER_TYPES),
    eventDate: z.iso.date().optional(),
    items: z.array(orderItemInputSchema).min(1, "Add at least one item").max(20),
  })
  .refine((data) => data.orderType !== "booking" || Boolean(data.eventDate), {
    message: "Please pick a date for your booking",
    path: ["eventDate"],
  });

export type CreateOrderRequestInput = z.infer<typeof createOrderRequestSchema>;

/** Response for both create endpoints. */
export const createdResourceSchema = z.object({ id: z.uuid() });
export type CreatedResourceDto = z.infer<typeof createdResourceSchema>;
