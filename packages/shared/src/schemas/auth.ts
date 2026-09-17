import { z } from "zod";
import { indianPhoneSchema } from "./common.js";

/** POST /auth/seller/login */
export const sellerLoginSchema = z.object({
  phone: indianPhoneSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type SellerLoginInput = z.infer<typeof sellerLoginSchema>;

/** POST /auth/admin/login */
export const adminLoginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** The authenticated principal, as returned by /auth/me and login. */
export const authUserSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("seller"),
    id: z.uuid(),
    name: z.string(),
    phone: z.string(),
    sellerId: z.uuid(),
    businessName: z.string(),
    sellerUserRole: z.enum(["owner", "staff"]),
  }),
  z.object({
    role: z.literal("admin"),
    id: z.uuid(),
    name: z.string(),
    email: z.string(),
  }),
]);
export type AuthUserDto = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});
export type LoginResponseDto = z.infer<typeof loginResponseSchema>;
