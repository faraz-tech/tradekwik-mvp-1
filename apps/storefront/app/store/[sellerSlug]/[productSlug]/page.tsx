import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getSitemapData } from "@/lib/api";
import { priceLine, stockLabels, telLink, waLink } from "@/lib/format";
import { absoluteUrl, jsonLdString, productJsonLd } from "@/lib/seo";
import { MediaGallery } from "@/components/media-gallery";

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{ sellerSlug: string; productSlug: string }>;
}

export async function generateStaticParams() {
  try {
    const data = await getSitemapData();
    return data.products.map((p) => ({
      sellerSlug: p.sellerSlug,
      productSlug: p.productSlug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { sellerSlug, productSlug } = await params;
  const product = await getProduct(sellerSlug, productSlug);
  if (!product) return {};

  const title = product.seoTitle ?? `${product.name} — ${product.seller.businessName}`;
  const description =
    product.seoDescription ??
    product.description?.slice(0, 160) ??
    `${product.name} from ${product.seller.businessName}, ${product.seller.city}. Inquire directly on TradeKwik.`;
  const image = product.media.find((m) => m.type === "image");

  return {
    title,
    description,
    alternates: { canonical: `/store/${sellerSlug}/${productSlug}` },
    openGraph: {
      title,
      description,
      ...(image && { images: [image.url] }),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { sellerSlug, productSlug } = await params;
  const product = await getProduct(sellerSlug, productSlug);
  if (!product) notFound();

  const { seller } = product;
  const pageUrl = absoluteUrl(`/store/${sellerSlug}/${productSlug}`);
  const stock = stockLabels[product.stockStatus];
  const waText = `Hi, I'm interested in "${product.name}" listed on TradeKwik. ${pageUrl}`;
  const specEntries = Object.entries(product.specs);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd(product, pageUrl)) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
        <Link href={`/store/${seller.slug}`} className="hover:text-blue-700">
          {seller.businessName}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <MediaGallery media={product.media} name={product.name} />

        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold text-stone-900">{priceLine(product)}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stock.className}`}>
              {stock.label}
            </span>
          </div>

          {/* CTAs — inquiry form arrives in the next phase; WhatsApp is primary until then */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={waLink(seller.whatsappNumber, waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-green-700"
            >
              Send inquiry on WhatsApp
            </a>
            <a
              href={telLink(seller.phone)}
              className="rounded-full border border-stone-300 bg-white px-6 py-3 text-center text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              📞 Call seller
            </a>
          </div>

          {/* Seller card */}
          <Link
            href={`/store/${seller.slug}`}
            className="mt-6 block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
          >
            <p className="text-xs uppercase tracking-wide text-stone-400">Sold by</p>
            <p className="mt-1 flex items-center gap-2 font-medium text-stone-900">
              {seller.businessName}
              {seller.isVerified && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  ✓ Verified
                </span>
              )}
            </p>
            <p className="text-sm text-stone-500">
              {seller.city}, {seller.state} · View store →
            </p>
          </Link>

          {product.description && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-stone-900">About this product</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700">
                {product.description}
              </p>
            </section>
          )}

          {specEntries.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-stone-900">Specifications</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {specEntries.map(([key, value]) => (
                      <tr key={key} className="border-b border-stone-200 last:border-0">
                        <th
                          scope="row"
                          className="w-2/5 py-2.5 pr-4 text-left font-medium text-stone-500"
                        >
                          {key}
                        </th>
                        <td className="py-2.5 text-stone-800">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
