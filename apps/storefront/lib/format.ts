import type { ProductWithSellerDto, PublicProductDto, StockStatus } from "@tradekwik/shared";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹ with Indian digit grouping: 150000 → "₹1,50,000" */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/**
 * Price display logic per spec:
 * price_on_request → "Price on request"
 * retail + bulk    → "₹X retail · ₹Y bulk (min Z units)"
 */
export function priceLine(product: PublicProductDto): string {
  if (product.priceOnRequest) return "Price on request";
  const { priceRetail, priceBulk, minBulkQty } = product;
  if (priceRetail != null && priceBulk != null) {
    const min = minBulkQty != null ? ` (min ${minBulkQty} units)` : "";
    return `${formatINR(priceRetail)} retail · ${formatINR(priceBulk)} bulk${min}`;
  }
  if (priceRetail != null) return formatINR(priceRetail);
  if (priceBulk != null) {
    const min = minBulkQty != null ? ` (min ${minBulkQty} units)` : "";
    return `${formatINR(priceBulk)} bulk${min}`;
  }
  return "Contact seller for price";
}

/** Short price for cards. */
export function priceShort(product: PublicProductDto): string {
  if (product.priceOnRequest) return "Price on request";
  if (product.priceRetail != null) return formatINR(product.priceRetail);
  if (product.priceBulk != null) return `${formatINR(product.priceBulk)} bulk`;
  return "Contact for price";
}

export const stockLabels: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In stock", className: "bg-green-100 text-green-800" },
  made_to_order: { label: "Made to order", className: "bg-amber-100 text-amber-800" },
  out_of_stock: { label: "Out of stock", className: "bg-red-100 text-red-700" },
};

/** WhatsApp deep link: wa.me/<digits>?text=... */
export function waLink(whatsappNumber: string, text: string): string {
  const digits = whatsappNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone}`;
}

/** First image of a product's media, if any. */
export function firstImage(product: PublicProductDto | ProductWithSellerDto) {
  return product.media.find((m) => m.type === "image") ?? null;
}
