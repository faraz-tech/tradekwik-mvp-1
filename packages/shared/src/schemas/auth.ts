import { z } from "zod";
import {
  ADMIN_ROLES,
  BUYER_TYPES,
  BUYER_VERIFICATION_STATUSES,
  SELLER_KINDS,
  SELLER_USER_ROLES,
} from "../constants.js";
import { ADMIN_PERMISSIONS, SELLER_PERMISSIONS } from "../permissions.js";
import { indianPhoneSchema } from "./common.js";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(100);

/** POST /auth/seller/login */
export const sellerLoginSchema = z.object({
  phone: indianPhoneSchema,
  password: passwordSchema,
});
export type SellerLoginInput = z.infer<typeof sellerLoginSchema>;

/** POST /auth/seller/register — public self sign-up; the store starts as `pending`. */
export const sellerRegisterSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(200),
  sellerKind: z.enum(SELLER_KINDS).default("retailer"),
  categoryId: z.uuid("Pick a category"),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().min(2, "Enter your city").max(100),
  state: z.string().trim().min(2, "Enter your state").max(100),
  phone: indianPhoneSchema,
  whatsappNumber: indianPhoneSchema,
  email: z.email("Enter a valid email").optional(),
  gstNumber: z.string().trim().max(20).optional(),
  servesPanIndia: z.boolean().default(false),
  ownerName: z.string().trim().min(2, "Enter your name").max(100),
  loginPhone: indianPhoneSchema,
  password: passwordSchema,
});
export type SellerRegisterInput = z.infer<typeof sellerRegisterSchema>;

export const sellerRegisterResponseSchema = z.object({
  sellerId: z.uuid(),
  businessName: z.string(),
  slug: z.string(),
  status: z.literal("pending"),
});
export type SellerRegisterResponseDto = z.infer<typeof sellerRegisterResponseSchema>;

/** POST /auth/admin/login */
export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: passwordSchema,
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** POST /auth/buyer/register */
export const buyerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name").max(100),
  phone: indianPhoneSchema,
  email: z.email("Enter a valid email").optional(),
  password: passwordSchema,
  buyerType: z.enum(BUYER_TYPES).default("personal"),
  companyName: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
});
export type BuyerRegisterInput = z.infer<typeof buyerRegisterSchema>;

/** POST /auth/buyer/login */
export const buyerLoginSchema = z.object({
  phone: indianPhoneSchema,
  password: passwordSchema,
});
export type BuyerLoginInput = z.infer<typeof buyerLoginSchema>;

/** The authenticated principal, as returned by /auth/me and login. */
export const authUserSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("seller"),
    id: z.uuid(),
    name: z.string(),
    phone: z.string(),
    sellerId: z.uuid(),
    businessName: z.string(),
    sellerUserRole: z.enum(SELLER_USER_ROLES),
    permissions: z.array(z.enum(SELLER_PERMISSIONS)),
  }),
  z.object({
    role: z.literal("admin"),
    id: z.uuid(),
    name: z.string(),
    email: z.string(),
    adminRole: z.enum(ADMIN_ROLES),
    permissions: z.array(z.enum(ADMIN_PERMISSIONS)),
  }),
  z.object({
    role: z.literal("buyer"),
    id: z.uuid(),
    name: z.string(),
    phone: z.string(),
    email: z.string().nullable(),
    buyerType: z.enum(BUYER_TYPES),
    companyName: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    verificationStatus: z.enum(BUYER_VERIFICATION_STATUSES),
  }),
]);
export type AuthUserDto = z.infer<typeof authUserSchema>;
export type SellerAuthUser = Extract<AuthUserDto, { role: "seller" }>;
export type AdminAuthUser = Extract<AuthUserDto, { role: "admin" }>;
export type BuyerAuthUser = Extract<AuthUserDto, { role: "buyer" }>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});
export type LoginResponseDto = z.infer<typeof loginResponseSchema>;
