import type {
  AdminInquiryDto,
  AdminLoginInput,
  AdminSellerDto,
  AdminUpdateSellerInput,
  ApiError,
  AuthUserDto,
  CreateSellerInput,
  PlatformOverviewDto,
  CategoryDto,
  CreateProductInput,
  LoginResponseDto,
  SellerDashboardDto,
  SellerInquiryDto,
  SellerLoginInput,
  SellerOrderRequestDto,
  SellerProductDto,
  SellerProfileDto,
  UpdateInquiryInput,
  UpdateOrderRequestInput,
  UpdateProductInput,
  UpdateSellerProfileInput,
  UploadResponseDto,
} from "@tradekwik/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiFetchError extends Error {
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
      headers:
        init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : undefined,
      ...init,
    });
  } catch {
    throw new ApiFetchError(0, "Could not reach the server. Is the API running?");
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as { data?: T } & Partial<ApiError>;
  if (!res.ok) {
    throw new ApiFetchError(
      res.status,
      body.message ?? "Something went wrong. Please try again.",
      body.errors,
    );
  }
  return body.data as T;
}

// ---- auth ----
export const login = (input: SellerLoginInput) =>
  request<LoginResponseDto>("/auth/seller/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const adminLogin = (input: AdminLoginInput) =>
  request<LoginResponseDto>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const logout = () => request<{ ok: true }>("/auth/logout", { method: "POST" });
export const me = () => request<AuthUserDto>("/auth/me");

// ---- seller panel ----
export const getDashboard = () => request<SellerDashboardDto>("/seller/dashboard");
export const getCategories = () => request<CategoryDto[]>("/categories");

export const listProducts = () => request<SellerProductDto[]>("/seller/products");
export const createProduct = (input: CreateProductInput) =>
  request<SellerProductDto>("/seller/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateProduct = (id: string, input: UpdateProductInput) =>
  request<SellerProductDto>(`/seller/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteProduct = (id: string) =>
  request<void>(`/seller/products/${id}`, { method: "DELETE" });

export const listInquiries = (status?: string) =>
  request<SellerInquiryDto[]>(`/seller/inquiries${status ? `?status=${status}` : ""}`);
export const updateInquiry = (id: string, input: UpdateInquiryInput) =>
  request<SellerInquiryDto>(`/seller/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const listOrders = (status?: string) =>
  request<SellerOrderRequestDto[]>(
    `/seller/order-requests${status ? `?status=${status}` : ""}`,
  );
export const updateOrder = (id: string, input: UpdateOrderRequestInput) =>
  request<SellerOrderRequestDto>(`/seller/order-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getProfile = () => request<SellerProfileDto>("/seller/profile");
export const updateProfile = (input: UpdateSellerProfileInput) =>
  request<SellerProfileDto>("/seller/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

// ---- super admin ----
export const adminListSellers = (status?: string) =>
  request<AdminSellerDto[]>(`/admin/sellers${status ? `?status=${status}` : ""}`);
export const adminCreateSeller = (input: CreateSellerInput) =>
  request<AdminSellerDto>("/admin/sellers", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const adminUpdateSeller = (id: string, input: AdminUpdateSellerInput) =>
  request<AdminSellerDto>(`/admin/sellers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const adminListInquiries = () => request<AdminInquiryDto[]>("/admin/inquiries");
export const adminOverview = () => request<PlatformOverviewDto>("/admin/overview");

export const uploadImage = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResponseDto>("/seller/uploads", { method: "POST", body: form });
};
