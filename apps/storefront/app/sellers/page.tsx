import type { Metadata } from "next";
import Link from "next/link";
import {
  SELLER_DIRECTORY_SORTS,
  SELLER_KINDS,
  SELLER_KIND_LABELS,
  type SellerDirectorySort,
  type SellerKind,
} from "@tradekwik/shared";
import { getCategories, listSellers } from "@/lib/api";
import { SellerCard } from "@/components/seller-card";
import { Pagination } from "@/components/pagination";

// Directory lists only sellers whose trial or paid plan is live (API enforces this).
export const revalidate = 60;

export const metadata: Metadata = {
  title: "All sellers — manufacturers, wholesalers & retailers",
  description:
    "Browse active businesses on TradeKwik: manufacturers, wholesalers, retailers and service providers across India. Contact them directly.",
  alternates: { canonical: "/sellers" },
};

const sortLabels: Record<SellerDirectorySort, string> = {
  featured: "Featured",
  newest: "Newest",
  name: "A–Z",
};

interface SellersPageProps {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    category?: string;
    state?: string;
    verified?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SellersPage({ searchParams }: SellersPageProps) {
  const raw = await searchParams;
  const kind = SELLER_KINDS.find((k) => k === raw.kind) as SellerKind | undefined;
  const sort = (SELLER_DIRECTORY_SORTS.find((s) => s === raw.sort) as SellerDirectorySort) ?? "featured";
  const q = raw.q?.trim().slice(0, 100) || undefined;
  const category = raw.category?.trim() || undefined;
  const state = raw.state?.trim() || undefined;
  const verified = raw.verified === "1";
  const page = Math.max(1, Math.floor(Number(raw.page)) || 1);

  const [results, categories] = await Promise.all([
    listSellers({ q, kind, category, state, verified, sort, page }),
    getCategories().catch(() => []),
  ]);

  /** Build a URL with one filter changed; drops `page` so filtering starts at page 1. */
  const href = (patch: Record<string, string | undefined>) => {
    const next: Record<string, string | undefined> = {
      q,
      kind,
      category,
      state,
      verified: verified ? "1" : undefined,
      sort: sort === "featured" ? undefined : sort,
      ...patch,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/sellers?${qs}` : "/sellers";
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition ${
      active
        ? "bg-stone-900 text-white"
        : "border border-stone-300 bg-white text-stone-700 hover:border-blue-400 hover:text-blue-700"
    }`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Sellers on TradeKwik</h1>
      <p className="mt-1 text-sm text-stone-600">
        {results.total} active business{results.total === 1 ? "" : "es"} across India. Open a store to see
        its catalogue, company details and contact options.
      </p>

      {/* Search */}
      <form method="get" action="/sellers" className="mt-5 flex max-w-lg gap-2">
        {kind && <input type="hidden" name="kind" value={kind} />}
        {category && <input type="hidden" name="category" value={category} />}
        {state && <input type="hidden" name="state" value={state} />}
        {verified && <input type="hidden" name="verified" value="1" />}
        <label htmlFor="seller-q" className="sr-only">Search sellers</label>
        <input
          id="seller-q"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Business name, city or what they sell…"
          className="h-10 w-full rounded-full border border-stone-300 bg-white px-4 text-sm outline-none focus:border-blue-500"
        />
        <button type="submit" className="h-10 shrink-0 rounded-full bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-700">
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="mt-5 grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-500">Type:</span>
          <Link href={href({ kind: undefined })} className={chip(!kind)}>All</Link>
          {SELLER_KINDS.map((k) => (
            <Link key={k} href={href({ kind: k })} className={chip(kind === k)}>
              {SELLER_KIND_LABELS[k]}
            </Link>
          ))}
          <Link href={href({ verified: verified ? undefined : "1" })} className={chip(verified)}>
            ✓ Verified only
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-500">Category:</span>
            <Link href={href({ category: undefined })} className={chip(!category)}>All</Link>
            {categories.map((c) => (
              <Link key={c.id} href={href({ category: c.slug })} className={chip(category === c.slug)}>
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {results.states.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-500">State:</span>
            <Link href={href({ state: undefined })} className={chip(!state)}>All</Link>
            {results.states.map((s) => (
              <Link key={s} href={href({ state: s })} className={chip(state === s)}>
                {s}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="mr-1 text-xs text-stone-500">Sort:</span>
          {SELLER_DIRECTORY_SORTS.map((s) => (
            <Link
              key={s}
              href={href({ sort: s })}
              className={`rounded-full px-3 py-1 text-xs ${
                s === sort ? "bg-stone-200 font-medium text-stone-900" : "text-stone-600 hover:text-blue-700"
              }`}
            >
              {sortLabels[s]}
            </Link>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.items.length === 0 ? (
        <div className="mt-12 text-center text-stone-500">
          <p>No sellers matched these filters.</p>
          <Link href="/sellers" className="mt-2 inline-block text-sm text-blue-700 hover:underline">
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {results.items.map((seller) => (
            <SellerCard key={seller.slug} seller={seller} />
          ))}
        </div>
      )}

      <Pagination
        page={results.page}
        pageSize={results.pageSize}
        total={results.total}
        basePath="/sellers"
        query={{
          q,
          kind,
          category,
          state,
          verified: verified ? "1" : undefined,
          sort: sort === "featured" ? undefined : sort,
        }}
      />
    </main>
  );
}
