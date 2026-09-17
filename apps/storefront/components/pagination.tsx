import Link from "next/link";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Base path, e.g. "/search"; existing query params to keep. */
  basePath: string;
  query?: Record<string, string | undefined>;
}

export function Pagination({ page, pageSize, total, basePath, query = {} }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50"
        >
          ← Previous
        </Link>
      )}
      <span className="px-3 text-sm text-stone-600">
        Page {page} of {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={href(page + 1)}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
