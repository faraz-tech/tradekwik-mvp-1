"use client";

import { useEffect, useState } from "react";
import type { BuyerOrderDto } from "@tradekwik/shared";
import { listBuyerOrders } from "@/lib/client-api";
import { OrderCard } from "@/components/account/order-bits";

const ACTIVE = new Set(["new", "confirmed", "in_progress", "ready", "dispatched", "delivered"]);

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<BuyerOrderDto[] | null>(null);
  const [tab, setTab] = useState<"active" | "past">("active");

  useEffect(() => {
    listBuyerOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const visible = (orders ?? []).filter((o) => (tab === "active" ? ACTIVE.has(o.status) : !ACTIVE.has(o.status)));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Orders & delivery</h1>
        <div className="flex gap-2">
          {(["active", "past"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize ${
                tab === t ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {orders === null ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-stone-500">No {tab} orders.</p>
      ) : (
        <div className="grid gap-3">
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
