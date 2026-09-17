import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, searchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const categoryEmoji: Record<string, string> = {
  "embroidery-machines": "🧵",
  "ice-cream-desserts": "🍨",
  "garments-tailoring": "👔",
};

export default async function HomePage() {
  // degrade gracefully if the API is briefly unavailable — never 500 the landing page
  const [categories, latest] = await Promise.all([
    getCategories().catch(() => []),
    searchProducts({ pageSize: 8 }).catch(() => ({
      items: [],
      page: 1,
      pageSize: 8,
      total: 0,
    })),
  ]);

  const sellers = [
    ...new Map(latest.items.map((p) => [p.seller.slug, p.seller])).values(),
  ];

  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-12 text-center sm:py-16">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
          Buy direct from Indian businesses
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-stone-600">
          Machines, food, garments and more from verified sellers. Send an inquiry and
          negotiate directly on WhatsApp or phone — no middlemen.
        </p>
        <form action="/search" className="mx-auto mt-8 flex max-w-lg gap-2">
          <input
            type="search"
            name="q"
            placeholder="What are you looking for?"
            className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-sm shadow-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Search
          </button>
        </form>
      </section>

      {/* Categories */}
      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-lg font-semibold text-stone-900">
          Shop by category
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <span className="text-3xl">{categoryEmoji[category.slug] ?? "🛍️"}</span>
              <span className="font-medium text-stone-900">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured sellers */}
      <section aria-labelledby="sellers-heading" className="mt-12">
        <h2 id="sellers-heading" className="text-lg font-semibold text-stone-900">
          Featured sellers
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {sellers.map((seller) => (
            <Link
              key={seller.slug}
              href={`/store/${seller.slug}`}
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <p className="flex items-center gap-2 font-medium text-stone-900">
                {seller.businessName}
                {seller.isVerified && (
                  <span
                    title="Verified seller"
                    className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
                  >
                    ✓ Verified
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {seller.city}, {seller.state}
              </p>
            </Link>
          ))}
        </div>
      </section>

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
    </main>
  );
}
