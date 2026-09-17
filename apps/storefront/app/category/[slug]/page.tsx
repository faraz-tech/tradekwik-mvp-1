import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getSitemapData, searchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";

export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  try {
    const data = await getSitemapData();
    return data.categories.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) return {};
  return {
    title: `${category.name} — buy direct from sellers`,
    description: `Browse ${category.name} from verified Indian sellers on TradeKwik. Inquire and negotiate directly.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const results = await searchProducts({ category: slug, page });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900">{category.name}</h1>
      <p className="mt-1 text-sm text-stone-500">
        {results.total} product{results.total === 1 ? "" : "s"} from verified sellers
      </p>

      {results.items.length === 0 ? (
        <p className="mt-12 text-center text-stone-500">
          No products in this category yet. Check back soon.
        </p>
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
        basePath={`/category/${slug}`}
      />
    </main>
  );
}
