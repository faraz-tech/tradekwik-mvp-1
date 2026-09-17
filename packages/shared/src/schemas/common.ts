import { z } from "zod";

/** Indian mobile number: 10 digits starting 6-9, with optional +91 prefix. */
export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number");

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
