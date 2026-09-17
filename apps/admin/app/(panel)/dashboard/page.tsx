"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SellerDashboardDto } from "@tradekwik/shared";
import { getDashboard } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<SellerDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const max = Math.max(1, ...data.inquiryTrend.map((d) => d.count));

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New inquiries" value={data.newInquiries} href="/inquiries" />
        <StatCard label="New orders" value={data.newOrders} href="/orders" />
        <StatCard label="Published products" value={data.publishedProducts} href="/products" />
        <StatCard label="Total products" value={data.totalProducts} href="/products" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inquiries — last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-2">
            {data.inquiryTrend.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium">{day.count > 0 ? day.count : ""}</span>
                <div
                  className="w-full rounded-t-md bg-blue-600/80"
                  style={{ height: `${Math.max(4, (day.count / max) * 120)}px` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {day.date.slice(5).replace("-", "/")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
