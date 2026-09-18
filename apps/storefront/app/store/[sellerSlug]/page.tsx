import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeller, getSellerProducts, getSitemapData } from "@/lib/api";
import { telLink, waLink } from "@/lib/format";
import { absoluteUrl, jsonLdString, localBusinessJsonLd } from "@/lib/seo";
import { LISTING_TYPES, STORE_SORTS, type ListingType, type StoreSort } from "@tradekwik/shared";
import { StoreListings, type StoreListingsState } from "@/components/store-listings";
import { InquiryForm } from "@/components/inquiry-form";
import { SellerKindBadge } from "@/components/seller-kind-badge";
import { ShareButton } from "@/components/share-button";

export const revalidate = 300;

interface StoreSearchParams {
  type?: string;
  q?: string;
  sort?: string;
  page?: string;
}

interface StorePageProps {
  params: Promise<{ sellerSlug: string }>;
  searchParams: Promise<StoreSearchParams>;
}

/** Validate ?type=&q=&sort=&page= from the URL; unknown values fall back to defaults. */
function parseListingState(raw: StoreSearchParams): StoreListingsState & { page: number } {
  const type = LISTING_TYPES.find((t) => t === raw.type) as ListingType | undefined;
  const sort = (STORE_SORTS.find((s) => s === raw.sort) as StoreSort | undefined) ?? "newest";
  const q = raw.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Math.floor(Number(raw.page)) || 1);
  return { type, q, sort, page };
}

export async function generateStaticParams() {
  try {
    const data = await getSitemapData();
    return data.sellers.map(({ slug }) => ({ sellerSlug: slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { sellerSlug } = await params;
  const seller = await getSeller(sellerSlug);
  if (!seller) return {};
  const description =
    seller.description ??
    `${seller.businessName} — ${seller.city}, ${seller.state}. Inquire directly on TradeKwik.`;
  return {
    title: `${seller.businessName} — ${seller.city}`,
    description,
    alternates: { canonical: `/store/${seller.slug}` },
    openGraph: {
      title: seller.businessName,
      description,
      ...(seller.coverImageUrl && { images: [seller.coverImageUrl] }),
    },
  };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const [{ sellerSlug }, rawSearch] = await Promise.all([params, searchParams]);
  const { page, ...state } = parseListingState(rawSearch);
  const [seller, results] = await Promise.all([
    getSeller(sellerSlug),
    getSellerProducts(sellerSlug, { ...state, page }),
  ]);
  if (!seller || !results) notFound();

  const storeUrl = absoluteUrl(`/store/${seller.slug}`);
  const waText = `Hi, I found ${seller.businessName} on TradeKwik and want to know more. ${storeUrl}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(localBusinessJsonLd(seller, storeUrl)) }}
      />

      {/* Store header */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {seller.logoUrl && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
              <Image src={seller.logoUrl} alt={`${seller.businessName} logo`} fill sizes="80px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-stone-900">
              {seller.businessName}
              <SellerKindBadge kind={seller.sellerKind} />
              {seller.isVerified && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  ✓ Verified seller
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {seller.city}, {seller.state}
              {seller.foundedYear ? ` · Since ${seller.foundedYear}` : ""}
              {seller.servesPanIndia
                ? " · Delivers all over India"
                : seller.deliveryRadiusKm
                  ? ` · Delivers within ${seller.deliveryRadiusKm} km`
                  : ""}
            </p>
            {seller.description && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-700">
                {seller.description}
              </p>
            )}
            <Link
              href={`/store/${seller.slug}/about`}
              className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
            >
              About the company, people &amp; process →
            </Link>
          </div>
        </div>

        {/* Contact CTAs — phone-first */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#inquiry"
            className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Send inquiry
          </a>
          <a
            href={waLink(seller.whatsappNumber, waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            WhatsApp seller
          </a>
          <a
            href={telLink(seller.phone)}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            📞 Call now
          </a>
          <ShareButton
            url={storeUrl}
            title={seller.businessName}
            text={`Check out ${seller.businessName} (${seller.city}) on TradeKwik.`}
          />
        </div>
      </section>

      {/* Catalogue with type tabs */}
      <StoreListings sellerSlug={seller.slug} results={results} state={state} />

      {/* Store-level inquiry */}
      <section
        id="inquiry"
        className="mt-12 scroll-mt-24 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:max-w-2xl"
      >
        <h2 className="text-lg font-semibold text-stone-900">
          Ask {seller.businessName} anything
        </h2>
        <p className="mb-4 mt-1 text-sm text-stone-500">
          Looking for something specific? Send an inquiry and the seller will contact you.
        </p>
        <InquiryForm
          sellerId={seller.id}
          source="store_page"
          whatsappHref={waLink(seller.whatsappNumber, waText)}
          showQuantity={false}
        />
      </section>
    </main>
  );
}
