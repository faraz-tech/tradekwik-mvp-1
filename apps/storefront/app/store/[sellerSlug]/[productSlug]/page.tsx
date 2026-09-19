import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProduct, getSitemapData } from "@/lib/api";
import { minOrderQty, priceLine, stockLabels } from "@/lib/format";
import { absoluteUrl, jsonLdString, productJsonLd } from "@/lib/seo";
import { MediaGallery } from "@/components/media-gallery";
import { InquiryForm } from "@/components/inquiry-form";
import { OrderForm } from "@/components/order-form";
import { PriceTiers } from "@/components/price-tiers";
import { SellerKindBadge } from "@/components/seller-kind-badge";
import { ShareButton } from "@/components/share-button";
import { SellerContact } from "@/components/seller-contact";

/** Categories whose products can be ordered/booked directly (not just inquired). */
const ORDERABLE_CATEGORY_SLUGS = new Set(["ice-cream-desserts", "garments-tailoring"]);

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
  const [product, categories] = await Promise.all([
    getProduct(sellerSlug, productSlug),
    getCategories(),
  ]);
  if (!product) notFound();

  const { seller } = product;
  const pageUrl = absoluteUrl(`/store/${sellerSlug}/${productSlug}`);
  const stock = stockLabels[product.stockStatus];
  const waText = `Hi, I'm interested in "${product.name}" listed on TradeKwik. ${pageUrl}`;
  const specEntries = Object.entries(product.specs);
  const categorySlug = categories.find((c) => c.id === product.categoryId)?.slug;
  const orderable = categorySlug ? ORDERABLE_CATEGORY_SLUGS.has(categorySlug) : false;
  const minQty = minOrderQty(product);
  const shareText = `${product.name} — ${priceLine(product)} from ${seller.businessName} (${seller.city}). Found it on TradeKwik.`;

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

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="lg:col-start-1">
          <MediaGallery media={product.media} name={product.name} />
        </div>

        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-3">
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold text-stone-900">{priceLine(product)}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stock.className}`}>
              {stock.label}
            </span>
          </div>
          {product.wholesaleOnly && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
              Wholesale only{minQty ? ` · minimum order ${minQty} units` : ""}. Inquire for a trade quote.
            </p>
          )}

          {/* CTAs — inquiry form is primary; WhatsApp & call are the fast lanes */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="#inquiry"
              className="rounded-full bg-blue-700 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800"
            >
              Send inquiry
            </a>
            {orderable && (
              <a
                href="#order"
                className="rounded-full bg-amber-500 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-amber-600"
              >
                Order / Book
              </a>
            )}
            <SellerContact sellerSlug={seller.slug} message={waText} size="md" />
            <ShareButton url={pageUrl} title={product.name} text={shareText} />
          </div>

          <PriceTiers product={product} />

          {/* Seller card */}
          <Link
            href={`/store/${seller.slug}`}
            className="mt-6 block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">Sold by</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 font-medium text-stone-900">
              {seller.businessName}
              <SellerKindBadge kind={seller.sellerKind} />
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
        {/* Inquiry + order forms — under the gallery on desktop, after details on mobile */}
        <section
          id="inquiry"
          className="lg:col-start-1 scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-stone-900">
            Send an inquiry for this product
          </h2>
          <p className="mb-4 mt-1 text-sm text-stone-500">
            Ask about price, delivery, or anything else — the seller replies directly.
          </p>
          <InquiryForm
            sellerId={product.sellerId}
            productId={product.id}
            source="product_page"
          />
        </section>

        {orderable && (
          <section
            id="order"
            className="lg:col-start-1 scroll-mt-24 rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-stone-900">Order / book now</h2>
            <p className="mb-4 mt-1 text-sm text-stone-500">
              Place a direct order or an advance booking. The seller confirms with you —
              no payment now.
            </p>
            <OrderForm
              sellerId={product.sellerId}
              productId={product.id}
              productName={product.name}
              wholesaleOnly={product.wholesaleOnly}
              minQty={minQty ?? undefined}
            />
          </section>
        )}
      </div>
    </main>
  );
}
