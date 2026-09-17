import type {
  ApiError,
  CreateInquiryInput,
  CreateOrderRequestInput,
  CreatedResourceDto,
} from "@tradekwik/shared";

/** Browser-side API base (forms post directly to the API; CORS allows it). */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

async function post(path: string, payload: unknown): Promise<SubmitResult> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { data?: CreatedResourceDto } & Partial<ApiError>;
    if (res.ok && body.data) {
      return { ok: true, id: body.data.id };
    }
    return {
      ok: false,
      message: body.message ?? "Something went wrong. Please try again.",
      fieldErrors: body.errors,
    };
  } catch {
    return {
      ok: false,
      message: "Could not reach the server. Check your connection and try again.",
    };
  }
}

export function submitInquiry(input: CreateInquiryInput): Promise<SubmitResult> {
  return post("/inquiries", input);
}

export function submitOrderRequest(input: CreateOrderRequestInput): Promise<SubmitResult> {
  return post("/order-requests", input);
}
