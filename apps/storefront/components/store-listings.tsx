import Link from "next/link";
import {
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  STORE_SORTS,
  type ListingType,
  type StoreSort,
} from "@tradekwik/shared";
import type { StoreProductsResult } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";

export interface StoreListingsState {
  type?: ListingType;
  q?: string;
  sort: StoreSort;
}

interface StoreListingsProps {
  sellerSlug: string;
  results: StoreProductsResult;
  state: StoreListingsState;
}

const sortLabels: Record<StoreSort, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

const pillBase = "rounded-full border px-3.5 py-1.5 text-sm font-medium transition";
const pillOn = "border-blue-700 bg-blue-700 text-white";
const pillOff =
  "border-stone-300 bg-white text-stone-700 hover:border-blue-400 hover:text-blue-700";

/**
 * Store catalogue: listing-type tabs, in-store search, sort and pagination.
 * All of it is URL state (?type=&q=&sort=&page=), so the page is server-rendered,
 * links are shareable, and each tab is indexable on its own.
 */
export function StoreListings({ sellerSlug, results, state }: StoreListingsProps) {
  const basePath = `/store/${sellerSlug}`;

  const href = (patch: Partial<StoreListingsState>) => {
    const next = { ...state, ...patch };
    const params = new URLSearchParams();
    if (next.type) params.set("type", next.type);
    if (next.q) params.set("q", next.q);
    if (next.sort !== "newest") params.set("sort", next.sort);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const presentTypes = LISTING_TYPES.filter((t) => (results.counts[t] ?? 0) > 0);
  const catalogueTotal = presentTypes.reduce((sum, t) => sum + (results.counts[t] ?? 0), 0);
  const showTabs = presentTypes.length > 1;
  const heading = showTabs
    ? "Catalogue"
    : presentTypes.length === 1
      ? LISTING_TYPE_LABELS[presentTypes[0]]
      : "Products";

  const tabs: { key: ListingType | undefined; label: string; count: number }[] = [
    { key: undefined, label: "All", count: catalogueTotal },
    ...presentTypes.map((t) => ({
      key: t,
      label: LISTING_TYPE_LABELS[t],
      count: results.counts[t] ?? 0,
    })),
  ];

  const scopeLabel = state.type ? LISTING_TYPE_LABELS[state.type].toLowerCase() : "this store";
  const hasCatalogue = catalogueTotal > 0 || Boolean(state.q);

  return (
    <section aria-labelledby="store-products" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="store-products" className="text-lg font-semibold text-stone-900">
          {heading} ({catalogueTotal})
        </h2>
        {showTabs && (
          <nav aria-label="Listing type" className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const selected = tab.key === state.type;
              return (
                <Link
                  key={tab.key ?? "all"}
                  href={href({ type: tab.key })}
                  aria-current={selected ? "page" : undefined}
                  className={`${pillBase} ${selected ? pillOn : pillOff}`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-xs ${selected ? "text-blue-100" : "text-stone-500"}`}
                  >
                    {tab.count}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {hasCatalogue && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form method="get" action={basePath} className="flex w-full max-w-md gap-2">
            {state.type && <input type="hidden" name="type" value={state.type} />}
            {state.sort !== "newest" && <input type="hidden" name="sort" value={state.sort} />}
            <label htmlFor="store-q" className="sr-only">
              Search in this store
            </label>
            <input
              id="store-q"
              name="q"
              type="search"
              defaultValue={state.q ?? ""}
              placeholder={`Search ${scopeLabel}…`}
              className="h-10 w-full rounded-full border border-stone-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-full bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-700"
            >
              Search
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="mr-1 text-stone-500">Sort:</span>
            {STORE_SORTS.map((sort) => {
              const selected = sort === state.sort;
              return (
                <Link
                  key={sort}
                  href={href({ sort })}
                  aria-current={selected ? "true" : undefined}
                  className={`rounded-full px-3 py-1 ${
                    selected
                      ? "bg-stone-200 font-medium text-stone-900"
                      : "text-stone-600 hover:text-blue-700"
                  }`}
                >
                  {sortLabels[sort]}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {state.q && (
        <p className="mt-3 text-sm text-stone-600">
          {results.total} result{results.total === 1 ? "" : "s"} for &ldquo;{state.q}&rdquo;
          {state.type ? ` in ${LISTING_TYPE_LABELS[state.type].toLowerCase()}` : ""}.{" "}
          <Link href={href({ q: undefined })} className="text-blue-700 hover:underline">
            Clear search
          </Link>
        </p>
      )}

      {results.items.length === 0 ? (
        <p className="mt-6 text-stone-500">
          {state.q ? "Nothing matched. Try another word." : "No products listed yet."}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {results.items.map((product) => (
            <ProductCard key={product.id} product={product} sellerSlug={sellerSlug} />
          ))}
        </div>
      )}

      <Pagination
        page={results.page}
        pageSize={results.pageSize}
        total={results.total}
        basePath={basePath}
        query={{
          type: state.type,
          q: state.q,
          sort: state.sort === "newest" ? undefined : state.sort,
        }}
      />
    </section>
  );
}
