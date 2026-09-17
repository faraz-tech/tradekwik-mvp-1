import type { ApiResponse, HealthDto } from "@tradekwik/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

async function apiGet<T>(
  path: string,
  init?: { revalidate?: number },
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate: init?.revalidate ?? 300 },
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed with ${res.status}`);
  }
  return (await res.json()) as ApiResponse<T>;
}

export async function getHealth(): Promise<HealthDto | null> {
  try {
    const res = await apiGet<HealthDto>("/health", { revalidate: 0 });
    return res.data;
  } catch {
    return null;
  }
}
