"use client";

import { useEffect, useState } from "react";
import type { PlatformOverviewDto } from "@tradekwik/shared";
import { adminOverview } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<PlatformOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminOverview().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading overview…</p>;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Sellers"
          value={data.sellers.total}
          sub={`${data.sellers.active} active · ${data.sellers.pending} pending · ${data.sellers.suspended} suspended`}
        />
        <Stat
          label="Products"
          value={data.products.total}
          sub={`${data.products.published} published`}
        />
        <Stat
          label="Inquiries"
          value={data.inquiries.total}
          sub={`${data.inquiries.last7Days} in last 7 days`}
        />
        <Stat
          label="Order requests"
          value={data.orderRequests.total}
          sub={`${data.orderRequests.last7Days} in last 7 days`}
        />
      </div>
    </div>
  );
}
