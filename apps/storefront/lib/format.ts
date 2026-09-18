import {
  ORDER_STATUS_LABELS,
  SELLER_KIND_LABELS,
  type OrderRequestStatus,
  type PriceTier,
  type ProductWithSellerDto,
  type PublicProductDto,
  type SellerKind,
  type StockStatus,
} from "@tradekwik/shared";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹ with Indian digit grouping: 150000 → "₹1,50,000" */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** All quantity breaks of a product, incl. the legacy bulk price, sorted by minQty. */
export function allTiers(product: PublicProductDto): PriceTier[] {
  const tiers = [...product.priceTiers];
  if (
    product.priceBulk != null &&
    product.minBulkQty != null &&
    !tiers.some((t) => t.minQty === product.minBulkQty)
  ) {
    tiers.push({ minQty: product.minBulkQty, price: product.priceBulk });
  }
  return tiers.sort((a, b) => a.minQty - b.minQty);
}

/** Minimum order quantity for wholesale-only listings. */
export function minOrderQty(product: PublicProductDto): number | null {
  const tiers = allTiers(product);
  if (tiers.length > 0) return tiers[0].minQty;
  return product.minBulkQty;
}

/**
 * Price display logic:
 * price_on_request → "Price on request"
 * wholesale only   → "From ₹X / unit · min N units"
 * retail + bulk    → "₹X retail · ₹Y bulk (min Z units)"
 */
export function priceLine(product: PublicProductDto): string {
  if (product.priceOnRequest) return "Price on request";
  if (product.wholesaleOnly) {
    const tiers = allTiers(product);
    if (tiers.length === 0) return "Wholesale — contact seller for price";
    const lowest = tiers[tiers.length - 1].price;
    const first = tiers[0];
    return tiers.length > 1
      ? `${formatINR(first.price)} – ${formatINR(lowest)} / unit · min ${first.minQty} units`
      : `${formatINR(first.price)} / unit · min ${first.minQty} units`;
  }
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
  if (product.wholesaleOnly) {
    const tiers = allTiers(product);
    if (tiers.length === 0) return "Wholesale";
    return `From ${formatINR(tiers[tiers.length - 1].price)} / unit`;
  }
  if (product.priceRetail != null) return formatINR(product.priceRetail);
  if (product.priceBulk != null) return `${formatINR(product.priceBulk)} bulk`;
  return "Contact for price";
}

export const stockLabels: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In stock", className: "bg-green-100 text-green-800" },
  made_to_order: { label: "Made to order", className: "bg-amber-100 text-amber-800" },
  out_of_stock: { label: "Out of stock", className: "bg-red-100 text-red-700" },
};

export const sellerKindLabel = (kind: SellerKind) => SELLER_KIND_LABELS[kind];

export const sellerKindStyles: Record<SellerKind, string> = {
  manufacturer: "bg-indigo-100 text-indigo-800",
  wholesaler: "bg-amber-100 text-amber-800",
  retailer: "bg-emerald-100 text-emerald-800",
  service_provider: "bg-pink-100 text-pink-800",
};

export const orderStatusLabel = (status: OrderRequestStatus) => ORDER_STATUS_LABELS[status];

export const orderStatusStyles: Record<OrderRequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-purple-100 text-purple-800",
  in_progress: "bg-amber-100 text-amber-800",
  ready: "bg-cyan-100 text-cyan-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-600",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

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

/** YouTube video id from any common YouTube URL shape. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com") || u.hostname.endsWith("youtube-nocookie.com")) {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    return null;
  }
  return null;
}
