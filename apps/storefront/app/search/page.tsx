import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, searchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";

export const metadata: Metadata = {
  title: "Search products",
  description:
    "Search machines, food, garments and more from verified Indian sellers on TradeKwik.",
  alternates: { canonical: "/search" },
  robots: { index: false },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const query = q?.trim() || undefined;
  const [results, categories] = await Promise.all([
    searchProducts({ q: query, page }),
    getCategories().catch(() => []),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900">
        {query ? `Results for “${query}”` : "All products"}
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        {results.total} product{results.total === 1 ? "" : "s"} found
      </p>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:border-blue-400 hover:text-blue-700"
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}

      {results.items.length === 0 ? (
        <div className="mt-12 text-center text-stone-500">
          <p>No products matched your search.</p>
          <p className="mt-1 text-sm">Try a different word, or browse by category from the homepage.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {results.items.map((product) => (
            <ProductCard key={product.id} product={product} showSeller />
          ))}
        </div>
      )}

      <Pagination
        page={results.page}
        pageSize={results.pageSize}
        total={results.total}
        basePath="/search"
        query={{ q: query }}
      />
    </main>
  );
}
