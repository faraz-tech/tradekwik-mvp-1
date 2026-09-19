import "server-only";
import type {
  ApiResponse,
  CategoryDto,
  ProductWithSellerDto,
  PublicProductDto,
  PublicSellerAboutDto,
  PublicSellerDto,
  SellerDirectoryMeta,
  SellerDirectoryQuery,
  SellerKind,
  SellerListItemDto,
  SitemapDataDto,
  StoreProductsMeta,
  StoreProductsQuery,
} from "@tradekwik/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

/** ISR window for API data (seconds). */
const REVALIDATE = 300;

class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`API ${path} responded with ${status}`);
  }
}

async function apiGet<T>(path: string, revalidate: number = REVALIDATE): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
  if (!res.ok) throw new ApiRequestError(res.status, path);
  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

/** Like apiGet but resolves to null on 404 (caller renders notFound()). */
async function apiGetOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export function getCategories(): Promise<CategoryDto[]> {
  return apiGet<CategoryDto[]>("/categories");
}

export function getSeller(slug: string): Promise<PublicSellerDto | null> {
  return apiGetOrNull<PublicSellerDto>(`/sellers/${encodeURIComponent(slug)}`);
}

/** Company details, process, social links, videos and owners for the About page. */
export function getSellerAbout(slug: string): Promise<PublicSellerAboutDto | null> {
  return apiGetOrNull<PublicSellerAboutDto>(`/sellers/${encodeURIComponent(slug)}/about`);
}

export interface SellerDirectoryResult extends SellerDirectoryMeta {
  items: SellerListItemDto[];
}

/** Public seller directory (/sellers). */
export async function listSellers(
  params: Partial<SellerDirectoryQuery> = {},
): Promise<SellerDirectoryResult> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.kind) search.set("kind", params.kind);
  if (params.category) search.set("category", params.category);
  if (params.state) search.set("state", params.state);
  if (params.verified) search.set("verified", "true");
  if (params.sort && params.sort !== "featured") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();

  const res = await fetch(`${API_URL}/sellers${qs ? `?${qs}` : ""}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new ApiRequestError(res.status, "/sellers");
  const body = (await res.json()) as ApiResponse<SellerListItemDto[]> & {
    meta: SellerDirectoryMeta;
  };
  return { items: body.data, ...body.meta };
}

export interface StoreProductsResult extends StoreProductsMeta {
  items: PublicProductDto[];
}

/** Paginated store catalogue (type / text filter, sort); null when the store is not found. */
export async function getSellerProducts(
  slug: string,
  params: Partial<StoreProductsQuery> = {},
): Promise<StoreProductsResult | null> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.q) search.set("q", params.q);
  if (params.sort && params.sort !== "newest") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  const path = `/sellers/${encodeURIComponent(slug)}/products${qs ? `?${qs}` : ""}`;

  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE } });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiRequestError(res.status, path);
  const body = (await res.json()) as ApiResponse<PublicProductDto[]> & {
    meta: StoreProductsMeta;
  };
  return { items: body.data, ...body.meta };
}

export function getProduct(
  sellerSlug: string,
  productSlug: string,
): Promise<ProductWithSellerDto | null> {
  return apiGetOrNull<ProductWithSellerDto>(
    `/sellers/${encodeURIComponent(sellerSlug)}/products/${encodeURIComponent(productSlug)}`,
  );
}

export interface ProductSearchResult {
  items: ProductWithSellerDto[];
  page: number;
  pageSize: number;
  total: number;
}

export async function searchProducts(params: {
  q?: string;
  category?: string;
  sellerKind?: SellerKind;
  page?: number;
  pageSize?: number;
}): Promise<ProductSearchResult> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.sellerKind) search.set("sellerKind", params.sellerKind);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();

  const res = await fetch(`${API_URL}/products${qs ? `?${qs}` : ""}`, {
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new ApiRequestError(res.status, "/products");
  const body = (await res.json()) as ApiResponse<ProductWithSellerDto[]> & {
    meta: { page: number; pageSize: number; total: number };
  };
  return { items: body.data, ...body.meta };
}

export function getSitemapData(): Promise<SitemapDataDto> {
  return apiGet<SitemapDataDto>("/sitemap-data", 3600);
}
