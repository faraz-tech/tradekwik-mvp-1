import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/api";
import { categoryIcon } from "@/lib/category-icons";

/** Full category list; tiles link to the product listing for that category. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "All categories",
  description:
    "Every category on TradeKwik — machines, home decoration, furniture, food, garments, hardware and more, from verified Indian sellers.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategories().catch(() => []);
  const parents = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const orphans = categories.filter((c) => c.parentId && !parents.some((p) => p.id === c.parentId));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">All categories</h1>
      <p className="mt-1 text-sm text-stone-600">
        Pick a category to see every product in it from sellers across India.
      </p>

      {categories.length === 0 ? (
        <p className="mt-10 text-stone-500">No categories yet.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...parents, ...orphans].map((category) => {
            const children = childrenOf(category.id);
            return (
              <div
                key={category.id}
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <Link href={`/category/${category.slug}`} className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>{categoryIcon(category.slug)}</span>
                  <span className="font-medium text-stone-900">{category.name}</span>
                </Link>
                {children.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-stone-100 pt-3 text-sm">
                    {children.map((child) => (
                      <li key={child.id}>
                        <Link href={`/category/${child.slug}`} className="text-stone-600 hover:text-blue-700 hover:underline">
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-sm text-stone-600">
        Can&apos;t find what you need?{" "}
        <Link href="/search" className="font-medium text-blue-700 hover:underline">Search all products</Link>{" "}
        or <Link href="/sellers" className="font-medium text-blue-700 hover:underline">browse sellers</Link>.
      </p>
    </main>
  );
}
