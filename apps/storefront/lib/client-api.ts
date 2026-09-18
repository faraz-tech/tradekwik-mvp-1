import type {
  ApiError,
  AuthUserDto,
  BuyerAuthUser,
  BuyerDashboardDto,
  BuyerInquiryDto,
  BuyerLoginInput,
  BuyerOrderActionInput,
  BuyerOrderDetailDto,
  BuyerOrderDto,
  BuyerProfileDto,
  BuyerRegisterInput,
  BuyerVerificationDto,
  CreateBuyerDocumentInput,
  CreateInquiryInput,
  CreateOrderRequestInput,
  CreatedResourceDto,
  LoginResponseDto,
  UpdateBuyerProfileInput,
} from "@tradekwik/shared";

/** Browser-side API base (forms post directly to the API; CORS allows it). */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      ...init,
    });
  } catch {
    throw new ClientApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as { data?: T } & Partial<ApiError>;
  if (!res.ok) {
    throw new ClientApiError(
      res.status,
      body.message ?? "Something went wrong. Please try again.",
      body.errors,
    );
  }
  return body.data as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

async function post(path: string, payload: unknown): Promise<SubmitResult> {
  try {
    const data = await request<CreatedResourceDto>(path, json("POST", payload));
    return { ok: true, id: data.id };
  } catch (error) {
    if (error instanceof ClientApiError) {
      return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
    }
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

// ---- public forms (cookie is sent, so a logged-in buyer gets linked) ----

export function submitInquiry(input: CreateInquiryInput): Promise<SubmitResult> {
  return post("/inquiries", input);
}

export function submitOrderRequest(input: CreateOrderRequestInput): Promise<SubmitResult> {
  return post("/order-requests", input);
}

// ---- buyer auth ----

export const buyerRegister = (input: BuyerRegisterInput) =>
  request<LoginResponseDto>("/auth/buyer/register", json("POST", input));
export const buyerLogin = (input: BuyerLoginInput) =>
  request<LoginResponseDto>("/auth/buyer/login", json("POST", input));
export const buyerLogout = () => request<{ ok: true }>("/auth/buyer/logout", { method: "POST" });

/** Current buyer, or null when not logged in. */
export async function buyerMe(): Promise<BuyerAuthUser | null> {
  try {
    const user = await request<AuthUserDto>("/auth/buyer/me");
    return user.role === "buyer" ? user : null;
  } catch (error) {
    if (error instanceof ClientApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

// ---- buyer dashboard ----

export const getBuyerDashboard = () => request<BuyerDashboardDto>("/buyer/dashboard");
export const getBuyerProfile = () => request<BuyerProfileDto>("/buyer/profile");
export const updateBuyerProfile = (input: UpdateBuyerProfileInput) =>
  request<BuyerProfileDto>("/buyer/profile", json("PATCH", input));
export const listBuyerInquiries = () => request<BuyerInquiryDto[]>("/buyer/inquiries");
export const listBuyerOrders = () => request<BuyerOrderDto[]>("/buyer/orders");
export const getBuyerOrder = (id: string) => request<BuyerOrderDetailDto>(`/buyer/orders/${id}`);
export const buyerOrderAction = (id: string, input: BuyerOrderActionInput) =>
  request<BuyerOrderDetailDto>(`/buyer/orders/${id}/actions`, json("POST", input));

// ---- buyer verification ----

export const getBuyerVerification = () => request<BuyerVerificationDto>("/buyer/verification");
export const addBuyerDocument = (input: CreateBuyerDocumentInput) =>
  request<BuyerVerificationDto>("/buyer/verification/documents", json("POST", input));
export const deleteBuyerDocument = (id: string) =>
  request<BuyerVerificationDto>(`/buyer/verification/documents/${id}`, { method: "DELETE" });
export const requestBuyerVerification = () =>
  request<BuyerVerificationDto>("/buyer/verification/request", { method: "POST" });

/** Multipart upload of a PDF/image (buyer cookie is sent automatically). */
export async function uploadDocument(file: File): Promise<{ url: string; mimeType: string; sizeBytes: number }> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/uploads/documents`, { method: "POST", credentials: "include", body: form });
  } catch {
    throw new ClientApiError(0, "Could not reach the server.");
  }
  const body = (await res.json().catch(() => ({}))) as {
    data?: { url: string; mimeType: string; sizeBytes: number };
  } & Partial<ApiError>;
  if (!res.ok || !body.data) throw new ClientApiError(res.status, body.message ?? "Upload failed.");
  return body.data;
}
