import {
  ORDER_STATUS_LABELS,
  type OrderRequestStatus,
  type SellerProductDto,
  type StockStatus,
} from "@tradekwik/shared";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatINR = (amount: number) => inr.format(amount);

export function priceLabel(product: SellerProductDto): string {
  if (product.priceOnRequest) return "On request";
  if (product.wholesaleOnly) {
    const first = product.priceTiers[0];
    const base = first ? first.price : product.priceBulk;
    return base != null ? `${formatINR(base)} wholesale` : "Wholesale";
  }
  if (product.priceRetail != null) return formatINR(product.priceRetail);
  if (product.priceBulk != null) return `${formatINR(product.priceBulk)} bulk`;
  return "—";
}

export const stockLabel: Record<StockStatus, string> = {
  in_stock: "In stock",
  made_to_order: "Made to order",
  out_of_stock: "Out of stock",
};

export const orderStatusLabel = (status: OrderRequestStatus) => ORDER_STATUS_LABELS[status];

export const orderStatusColors: Record<OrderRequestStatus, string> = {
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

export function waReplyLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}
