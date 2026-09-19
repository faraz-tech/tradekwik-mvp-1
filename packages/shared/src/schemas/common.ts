import { z } from "zod";

/**
 * Normalise the ways people type an Indian mobile number to the bare 10 digits:
 *   "+91 98765 00001", "91-9876500001", "09876500001", "9876500001" → "9876500001"
 * Returns the cleaned input unchanged when it cannot be reduced to 10 digits,
 * so the regex below produces the error message.
 */
export function normalizeIndianMobile(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/**
 * Indian mobile number per TRAI numbering: 10 digits, first digit 6–9.
 * Accepts +91 / 91 / leading-0 / spaces / dashes on input, outputs the bare 10 digits.
 * Rejects obvious junk such as 9999999999. International numbers are not accepted yet.
 */
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeIndianMobile)
  .pipe(
    z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
      .refine((v) => !/^(\d)\1{9}$/.test(v), "This does not look like a real mobile number"),
  );

/** Standard API success envelope: { data, meta? } */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

/** Standard API error envelope. */
export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

/** Placeholder health-check DTO used to verify the shared package wiring. */
export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string(),
});

export type HealthDto = z.infer<typeof healthSchema>;
