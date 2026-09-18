import type {
  AdminBuyerVerificationDto,
  AdminInquiryDto,
  AdminLoginInput,
  AdminSellerVerificationDto,
  AdminSellerDto,
  AdminUpdateSellerInput,
  ApiError,
  AuthUserDto,
  ConvertInquiryInput,
  CreateDocumentInput,
  CreateOwnerInput,
  CreateSellerInput,
  CreateTeamMemberInput,
  PlatformOverviewDto,
  ReviewBuyerInput,
  ReviewDocumentInput,
  CategoryDto,
  CreateProductInput,
  LoginResponseDto,
  SellerCompanyProfileInput,
  SellerCompanyProfileOwnDto,
  SellerDashboardDto,
  SellerInquiryDto,
  SellerLoginInput,
  SellerOrderDetailDto,
  SellerOrderRequestDto,
  SellerOwnerDto,
  SellerProductDto,
  SellerProfileDto,
  SellerRegisterInput,
  SellerRegisterResponseDto,
  SellerTeamMemberDto,
  SellerVerificationDto,
  UpdateDocumentInput,
  UpdateInquiryInput,
  UpdateOrderRequestInput,
  UpdateOwnerInput,
  UpdateProductInput,
  UpdateSellerProfileInput,
  UpdateTeamMemberInput,
  UploadResponseDto,
  UpsertShipmentInput,
  VerificationQueueDto,
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

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

// ---- auth ----
export const login = (input: SellerLoginInput) =>
  request<LoginResponseDto>("/auth/seller/login", json("POST", input));
export const adminLogin = (input: AdminLoginInput) =>
  request<LoginResponseDto>("/auth/admin/login", json("POST", input));
export const logout = () => request<{ ok: true }>("/auth/logout", { method: "POST" });
export const registerSeller = (input: SellerRegisterInput) =>
  request<SellerRegisterResponseDto>("/auth/seller/register", json("POST", input));
export const me = () => request<AuthUserDto>("/auth/me");

// ---- seller panel ----
export const getDashboard = () => request<SellerDashboardDto>("/seller/dashboard");
export const getCategories = () => request<CategoryDto[]>("/categories");

export const listProducts = () => request<SellerProductDto[]>("/seller/products");
export const createProduct = (input: CreateProductInput) =>
  request<SellerProductDto>("/seller/products", json("POST", input));
export const updateProduct = (id: string, input: UpdateProductInput) =>
  request<SellerProductDto>(`/seller/products/${id}`, json("PATCH", input));
export const deleteProduct = (id: string) =>
  request<void>(`/seller/products/${id}`, { method: "DELETE" });

export const listInquiries = (status?: string) =>
  request<SellerInquiryDto[]>(`/seller/inquiries${status ? `?status=${status}` : ""}`);
export const updateInquiry = (id: string, input: UpdateInquiryInput) =>
  request<SellerInquiryDto>(`/seller/inquiries/${id}`, json("PATCH", input));
export const convertInquiry = (id: string, input: ConvertInquiryInput) =>
  request<SellerOrderDetailDto>(`/seller/inquiries/${id}/convert`, json("POST", input));

export const listOrders = (status?: string) =>
  request<SellerOrderRequestDto[]>(
    `/seller/order-requests${status ? `?status=${status}` : ""}`,
  );
export const getOrder = (id: string) =>
  request<SellerOrderDetailDto>(`/seller/order-requests/${id}`);
export const updateOrder = (id: string, input: UpdateOrderRequestInput) =>
  request<SellerOrderDetailDto>(`/seller/order-requests/${id}`, json("PATCH", input));
export const upsertShipment = (id: string, input: UpsertShipmentInput) =>
  request<SellerOrderDetailDto>(`/seller/order-requests/${id}/shipment`, json("PUT", input));

export const getProfile = () => request<SellerProfileDto>("/seller/profile");
export const updateProfile = (input: UpdateSellerProfileInput) =>
  request<SellerProfileDto>("/seller/profile", json("PATCH", input));

export const getCompanyProfile = () =>
  request<SellerCompanyProfileOwnDto>("/seller/company-profile");
export const updateCompanyProfile = (input: SellerCompanyProfileInput) =>
  request<SellerCompanyProfileOwnDto>("/seller/company-profile", json("PUT", input));

export const listOwners = () => request<SellerOwnerDto[]>("/seller/owners");
export const createOwner = (input: CreateOwnerInput) =>
  request<SellerOwnerDto>("/seller/owners", json("POST", input));
export const updateOwner = (id: string, input: UpdateOwnerInput) =>
  request<SellerOwnerDto>(`/seller/owners/${id}`, json("PATCH", input));
export const deleteOwner = (id: string) =>
  request<void>(`/seller/owners/${id}`, { method: "DELETE" });

export const listTeam = () => request<SellerTeamMemberDto[]>("/seller/team");
export const createTeamMember = (input: CreateTeamMemberInput) =>
  request<SellerTeamMemberDto>("/seller/team", json("POST", input));
export const updateTeamMember = (id: string, input: UpdateTeamMemberInput) =>
  request<SellerTeamMemberDto>(`/seller/team/${id}`, json("PATCH", input));
export const deleteTeamMember = (id: string) =>
  request<void>(`/seller/team/${id}`, { method: "DELETE" });

// ---- documents & verification (seller) ----
export const getSellerVerification = () => request<SellerVerificationDto>("/seller/documents");
export const addSellerDocument = (input: CreateDocumentInput) =>
  request<SellerVerificationDto>("/seller/documents", json("POST", input));
export const updateSellerDocument = (id: string, input: UpdateDocumentInput) =>
  request<SellerVerificationDto>(`/seller/documents/${id}`, json("PATCH", input));
export const deleteSellerDocument = (id: string) =>
  request<SellerVerificationDto>(`/seller/documents/${id}`, { method: "DELETE" });

export const uploadDocument = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResponseDto & { mimeType: string; sizeBytes: number }>("/uploads/documents", {
    method: "POST",
    body: form,
  });
};

// ---- verification desk (admin) ----
export const adminVerificationQueue = () => request<VerificationQueueDto>("/admin/verification/queue");
export const adminReviewDocument = (id: string, input: ReviewDocumentInput) =>
  request<AdminSellerVerificationDto>(`/admin/verification/documents/${id}`, json("PATCH", input));
export const adminReviewBuyer = (id: string, input: ReviewBuyerInput) =>
  request<AdminBuyerVerificationDto>(`/admin/verification/buyers/${id}`, json("PATCH", input));

// ---- super admin ----
export const adminListSellers = (status?: string) =>
  request<AdminSellerDto[]>(`/admin/sellers${status ? `?status=${status}` : ""}`);
export const adminCreateSeller = (input: CreateSellerInput) =>
  request<AdminSellerDto>("/admin/sellers", json("POST", input));
export const adminUpdateSeller = (id: string, input: AdminUpdateSellerInput) =>
  request<AdminSellerDto>(`/admin/sellers/${id}`, json("PATCH", input));
export const adminListInquiries = () => request<AdminInquiryDto[]>("/admin/inquiries");
export const adminOverview = () => request<PlatformOverviewDto>("/admin/overview");

export const uploadImage = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResponseDto>("/seller/uploads", { method: "POST", body: form });
};
