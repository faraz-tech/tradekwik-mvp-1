"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BuyerDashboardDto } from "@tradekwik/shared";
import { getBuyerDashboard } from "@/lib/client-api";
import { OrderCard } from "@/components/account/order-bits";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-blue-300">
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </Link>
  );
}

export default function AccountOverviewPage() {
  const [data, setData] = useState<BuyerDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBuyerDashboard().then(setData).catch(() => setError("Could not load your dashboard."));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-stone-500">Loading…</p>;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold text-stone-900">Overview</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open inquiries" value={data.openInquiries} href="/account/inquiries" />
        <Stat label="Active orders" value={data.activeOrders} href="/account/orders" />
        <Stat label="In transit" value={data.inTransit} href="/account/orders" />
        <Stat label="Completed" value={data.completedOrders} href="/account/orders" />
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Recent orders</h2>
          <Link href="/account/orders" className="text-sm text-blue-700 hover:underline">View all</Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">
            No orders yet. Find a seller and place an order request — it will show up here with
            live delivery tracking.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {data.recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
