import Link from "next/link";
import { ORDER_STATUS_LABELS, ORDER_TIMELINE, type BuyerOrderDto, type OrderRequestStatus } from "@tradekwik/shared";
import { formatDate, formatINR, orderStatusStyles } from "@/lib/format";

export function OrderStatusPill({ status }: { status: OrderRequestStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusStyles[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

/** Where the order is in its lifecycle, as a progress bar. */
export function OrderProgress({ status }: { status: OrderRequestStatus }) {
  if (status === "cancelled") {
    return <p className="text-sm font-medium text-stone-600">This order was cancelled.</p>;
  }
  const current = ORDER_TIMELINE.indexOf(status);
  return (
    <ol className="grid grid-cols-7 gap-1">
      {ORDER_TIMELINE.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} className="text-center">
            <div className={`h-1.5 rounded-full ${done ? "bg-blue-700" : "bg-stone-200"}`} />
            <p className={`mt-1 hidden text-[11px] leading-tight sm:block ${done ? "text-stone-800" : "text-stone-400"}`}>
              {ORDER_STATUS_LABELS[step]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderCard({ order }: { order: BuyerOrderDto }) {
  const amount = order.agreedAmount ?? order.quotedAmount;
  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-stone-500">{order.orderNumber}</p>
        <OrderStatusPill status={order.status} />
      </div>
      <p className="mt-1 font-medium text-stone-900">{order.seller.businessName}</p>
      <p className="text-sm text-stone-600">
        {order.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}
      </p>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
        <span>Placed {formatDate(order.createdAt)}</span>
        {amount != null && <span className="font-medium text-stone-800">{formatINR(amount)}</span>}
        {order.expectedDeliveryOn && order.status !== "completed" && <span>Expected {order.expectedDeliveryOn}</span>}
      </div>
    </Link>
  );
}
