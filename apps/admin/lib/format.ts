import type { SellerProductDto, StockStatus } from "@tradekwik/shared";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatINR = (amount: number) => inr.format(amount);

export function priceLabel(product: SellerProductDto): string {
  if (product.priceOnRequest) return "On request";
  if (product.priceRetail != null) return formatINR(product.priceRetail);
  if (product.priceBulk != null) return `${formatINR(product.priceBulk)} bulk`;
  return "—";
}

export const stockLabel: Record<StockStatus, string> = {
  in_stock: "In stock",
  made_to_order: "Made to order",
  out_of_stock: "Out of stock",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function waReplyLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}
