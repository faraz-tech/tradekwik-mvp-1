"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FREIGHT_TERM_LABELS, type BuyerOrderDetailDto } from "@tradekwik/shared";
import { buyerOrderAction, ClientApiError, getBuyerOrder } from "@/lib/client-api";
import { formatDate, formatDateTime, formatINR, telLink, waLink } from "@/lib/format";
import { OrderProgress, OrderStatusPill } from "@/components/account/order-bits";
import { SellerKindBadge } from "@/components/seller-kind-badge";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-36 shrink-0 text-xs uppercase tracking-wide text-stone-500 sm:pt-0.5">{label}</dt>
      <dd className="text-sm text-stone-800">{value}</dd>
    </div>
  );
}

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<BuyerOrderDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getBuyerOrder(id).then(setOrder).catch(() => setError("Order not found."));
  }, [id]);

  async function act(action: "confirm_received" | "cancel" | "message", note?: string) {
    setBusy(true);
    setError(null);
    try {
      setOrder(await buyerOrderAction(id, { action, note }));
      setMessage("");
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <p className="text-sm text-red-600">{error}</p>;
  if (!order) return <p className="text-sm text-stone-500">Loading…</p>;

  const s = order.shipment;
  const amount = order.agreedAmount ?? order.quotedAmount;
  const itemsTotal = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);
  const canConfirm = order.status === "dispatched" || order.status === "delivered";
  const canCancel = order.status === "new";
  const isOpen = order.status !== "completed" && order.status !== "cancelled";

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/account/orders" className="text-sm text-stone-500 hover:text-blue-700">← All orders</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">Order {order.orderNumber}</h1>
          <OrderStatusPill status={order.status} />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Placed {formatDate(order.createdAt)} · <span className="capitalize">{order.orderType}</span>
          {order.eventDate && ` · for ${order.eventDate}`}
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <OrderProgress status={order.status} />
        {order.expectedDeliveryOn && isOpen && (
          <p className="mt-3 text-sm text-stone-700">
            Expected delivery <span className="font-medium">{order.expectedDeliveryOn}</span>
          </p>
        )}
      </section>

      {/* Transport / bilty — the part the buyer needs to receive the goods */}
      {s ? (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-stone-900">🚚 Transport details</h2>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-800">
              {s.status.replace("_", " ")}
            </span>
          </div>
          <dl className="mt-3 grid gap-2">
            <Row label="Transporter" value={s.transportName} />
            <Row label="Route / branch" value={s.transportBranch} />
            <Row
              label="LR / bilty no."
              value={<span className="font-mono text-base font-semibold tracking-wide">{s.lrNumber}</span>}
            />
            <Row label="Vehicle" value={s.vehicleNumber} />
            <Row label="Packages" value={s.packagesCount} />
            <Row label="Dispatched" value={s.dispatchedAt ? formatDateTime(s.dispatchedAt) : null} />
            <Row label="Expected" value={s.expectedDeliveryOn} />
            <Row label="Delivered" value={s.deliveredAt ? formatDateTime(s.deliveredAt) : null} />
            <Row label="Freight" value={order.freightTerm ? FREIGHT_TERM_LABELS[order.freightTerm] : null} />
            <Row label="Notes" value={s.notes} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.transportPhone && (
              <a href={telLink(s.transportPhone)} className="rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
                📞 Call transporter
              </a>
            )}
            {s.driverPhone && (
              <a href={telLink(s.driverPhone)} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
                Call driver
              </a>
            )}
            {s.lrDocumentUrl && (
              <a href={s.lrDocumentUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
                View bilty
              </a>
            )}
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(s.lrNumber)}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Copy LR number
            </button>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Take the LR number and your ID to the transporter&apos;s branch to collect the goods, or wait for
            door delivery if agreed.
            {order.freightTerm === "to_pay" && " Freight is payable to the transporter on delivery."}
          </p>
        </section>
      ) : (
        isOpen && (
          <section className="rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">
            Transport details will appear here once the seller books the transporter and enters the LR
            (bilty) number.
          </section>
        )
      )}

      {canConfirm && (
        <section className="rounded-xl border border-green-200 bg-green-50/50 p-5">
          <p className="text-sm font-medium text-stone-900">Received your goods?</p>
          <p className="mt-1 text-xs text-stone-600">Confirming closes the order and tells the seller it arrived.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => act("confirm_received")}
            className="mt-3 rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            ✓ Yes, I received the goods
          </button>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-stone-900">Items</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-3">
                <span>
                  {item.name} × {item.qty}
                  {item.notes && <span className="text-stone-500"> — {item.notes}</span>}
                </span>
                {item.unitPrice != null && <span className="shrink-0">{formatINR(item.unitPrice * item.qty)}</span>}
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid gap-2 border-t border-stone-200 pt-3">
            {itemsTotal > 0 && <Row label="Items total" value={formatINR(itemsTotal)} />}
            {order.quotedAmount != null && <Row label="Quoted" value={formatINR(order.quotedAmount)} />}
            {order.agreedAmount != null && (
              <Row label="Agreed amount" value={<span className="font-semibold">{formatINR(order.agreedAmount)}</span>} />
            )}
            {amount == null && <Row label="Amount" value="To be quoted by the seller" />}
          </dl>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-stone-900">Seller & delivery</h2>
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={`/store/${order.seller.slug}`} className="font-medium text-stone-900 hover:text-blue-700">
              {order.seller.businessName}
            </Link>
            <SellerKindBadge kind={order.seller.sellerKind} />
          </p>
          <p className="text-sm text-stone-500">{order.seller.city}, {order.seller.state}</p>
          <dl className="mt-3 grid gap-2">
            <Row label="Deliver to" value={order.deliveryAddress} />
            <Row label="Your transport" value={order.transportPreference} />
            <Row label="Your notes" value={order.buyerNotes} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={waLink(order.seller.whatsappNumber, `Hi, about my order ${order.orderNumber} on TradeKwik:`)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              WhatsApp seller
            </a>
            <a href={telLink(order.seller.phone)} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
              📞 Call seller
            </a>
          </div>
        </section>
      </div>

      {isOpen && (
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-stone-900">Message the seller</h2>
          <p className="mt-1 text-xs text-stone-500">Goes on the order timeline, so both sides have a record.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Please send by VRL, Pune Market Yard branch"
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              disabled={busy || !message.trim()}
              onClick={() => act("message", message.trim())}
              className="shrink-0 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
            >
              Send
            </button>
          </div>
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("Cancel this order request?")) void act("cancel");
              }}
              className="mt-3 text-sm text-stone-500 hover:text-red-600"
            >
              Cancel this request
            </button>
          )}
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-stone-900">Timeline</h2>
        <ol className="mt-3 grid gap-3 border-l-2 border-stone-200 pl-4">
          {order.events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-700" />
              <p className="text-xs text-stone-500">
                {formatDateTime(event.createdAt)} · {event.actorType === "buyer" ? "You" : event.actorName ?? event.actorType}
              </p>
              {event.status && <OrderStatusPill status={event.status} />}
              {event.note && <p className="mt-1 text-sm text-stone-800">{event.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
