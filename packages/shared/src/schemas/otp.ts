import { z } from "zod";
import { indianPhoneSchema } from "./common.js";

/** What the OTP is proving the phone for. */
export const OTP_PURPOSES = ["buyer_register", "seller_register"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

/** POST /auth/otp/send */
export const sendOtpSchema = z.object({
  phone: indianPhoneSchema,
  purpose: z.enum(OTP_PURPOSES),
});
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

export const sendOtpResponseSchema = z.object({
  /** Seconds until the code expires. */
  expiresIn: z.number().int(),
  /** Seconds before another code can be requested. */
  resendAfter: z.number().int(),
  /** Wrong guesses allowed for this code. */
  attemptsAllowed: z.number().int(),
  /** Codes this number can still request in the current 24 h window. */
  sendsLeftToday: z.number().int(),
  /** Only present outside production, so the flow can be tested without an SMS provider. */
  devCode: z.string().optional(),
});
export type SendOtpResponseDto = z.infer<typeof sendOtpResponseSchema>;

/** POST /auth/otp/verify */
export const verifyOtpSchema = z.object({
  phone: indianPhoneSchema,
  purpose: z.enum(OTP_PURPOSES),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const verifyOtpResponseSchema = z.object({
  /** Short-lived proof that this phone was verified; pass it as `otpToken` when registering. */
  otpToken: z.string(),
  expiresAt: z.iso.datetime(),
});
export type VerifyOtpResponseDto = z.infer<typeof verifyOtpResponseSchema>;
