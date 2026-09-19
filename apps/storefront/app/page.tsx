import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, listSellers, searchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { HomeHighlights } from "@/components/home-highlights";
import { SellerCard } from "@/components/seller-card";
import { categoryIcon } from "@/lib/category-icons";

/** Home: carousel, search, six categories, latest sellers and products. */
export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // degrade gracefully if the API is briefly unavailable — never 500 the landing page
  const [categories, latest, sellerList] = await Promise.all([
    getCategories().catch(() => []),
    searchProducts({ pageSize: 8 }).catch(() => ({
      items: [],
      page: 1,
      pageSize: 8,
      total: 0,
    })),
    listSellers({ pageSize: 4 }).catch(() => ({
      items: [],
      page: 1,
      pageSize: 4,
      total: 0,
      states: [],
    })),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Rotating value props double as the hero */}
      <div className="pt-6">
        <h1 className="sr-only">TradeKwik — buy direct from Indian businesses</h1>
        <HomeHighlights />
      </div>

      <form action="/search" className="mx-auto mt-6 flex max-w-lg gap-2">
        <input
          type="search"
          name="q"
          placeholder="Search machines, materials, food, garments…"
          className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-sm shadow-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Search
        </button>
      </form>

      {/* Categories — first six; the rest live on /categories */}
      <section aria-labelledby="categories-heading" className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 id="categories-heading" className="text-lg font-semibold text-stone-900">
            Shop by category
          </h2>
          {categories.length > 6 && (
            <Link href="/categories" className="text-sm font-medium text-blue-700 hover:underline">
              View all ({categories.length}) →
            </Link>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden>{categoryIcon(category.slug)}</span>
              <span className="font-medium text-stone-900">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured sellers */}
      {/* Latest products */}
      <section aria-labelledby="products-heading" className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 id="products-heading" className="text-lg font-semibold text-stone-900">
            Latest products
          </h2>
          <Link href="/search" className="text-sm font-medium text-blue-700 hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {latest.items.map((product) => (
            <ProductCard key={product.id} product={product} showSeller />
          ))}
        </div>
      </section>
      <section aria-labelledby="sellers-heading" className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 id="sellers-heading" className="text-lg font-semibold text-stone-900">
            Latest sellers
          </h2>
          <Link href="/sellers" className="text-sm font-medium text-blue-700 hover:underline">
            View all {sellerList.total > 0 ? `(${sellerList.total})` : ""} →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {sellerList.items.map((seller) => (
            <SellerCard key={seller.slug} seller={seller} />
          ))}
        </div>
      </section>

    </main>
  );
}
