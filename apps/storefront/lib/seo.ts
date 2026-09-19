import type { ProductWithSellerDto, PublicSellerDto } from "@tradekwik/shared";
import { firstImage } from "./format";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SITE_NAME = "TradeKwik";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** JSON-LD Product schema for product pages. */
export function productJsonLd(product: ProductWithSellerDto, url: string) {
  const image = firstImage(product);
  const availability =
    product.stockStatus === "out_of_stock"
      ? "https://schema.org/OutOfStock"
      : product.stockStatus === "made_to_order"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seoDescription ?? product.description ?? undefined,
    image: image ? [image.url] : undefined,
    url,
    brand: { "@type": "Brand", name: product.seller.businessName },
    ...(product.priceRetail != null && {
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: product.priceRetail,
        availability,
        url,
        seller: { "@type": "Organization", name: product.seller.businessName },
      },
    }),
  };
}

/** JSON-LD LocalBusiness schema for store pages. */
export function localBusinessJsonLd(seller: PublicSellerDto, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: seller.businessName,
    description: seller.description ?? undefined,
    image: seller.logoUrl ?? undefined,
    url,
    // telephone is deliberately omitted: public seller numbers are masked
    address: {
      "@type": "PostalAddress",
      streetAddress: seller.address ?? undefined,
      addressLocality: seller.city,
      addressRegion: seller.state,
      addressCountry: "IN",
    },
  };
}

/** Serialize JSON-LD for a <script> tag. */
export function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
