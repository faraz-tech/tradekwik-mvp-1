"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PLAN_DEFINITIONS, type SellerDashboardDto, type SellerSubscriptionDto } from "@tradekwik/shared";
import { getDashboard, getSubscription } from "@/lib/api";
import { useAuthUser } from "@/components/auth-context";
import { STOREFRONT_URL, storeAboutUrl, storeUrl } from "@/lib/storefront";
import { Button } from "@/components/ui/button";
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
  const me = useAuthUser();
  const [data, setData] = useState<SellerDashboardDto | null>(null);
  const [sub, setSub] = useState<SellerSubscriptionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch((e: Error) => setError(e.message));
    getSubscription().then(setSub).catch(() => setSub(null));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;

  const max = Math.max(1, ...data.inquiryTrend.map((d) => d.count));
  const steps = [
    { done: data.onboarding.storeSettings, label: "Complete store settings (description, address, logo)", href: "/store-settings" },
    { done: data.onboarding.companyProfile, label: "Fill in your company profile", href: "/company-profile" },
    { done: data.onboarding.firstProduct, label: "Publish your first product", href: "/products/new" },
    { done: data.onboarding.documents, label: "Upload documents for verification", href: "/documents" },
    { done: data.onboarding.isVerified, label: "Get the Verified seller badge", href: "/documents" },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {me?.role === "seller" && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="min-w-0">
              <p className="text-sm font-medium">Your public store</p>
              <a
                href={storeUrl(me.sellerSlug)}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm text-blue-700 hover:underline"
              >
                {STOREFRONT_URL.replace(/^https?:\/\//, "")}/store/{me.sellerSlug} ↗
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                This is what buyers see. Share the link on WhatsApp, your visiting card or social media.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={storeUrl(me.sellerSlug)} target="_blank" rel="noopener noreferrer">
                  View store
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={storeAboutUrl(me.sellerSlug)} target="_blank" rel="noopener noreferrer">
                  View About page
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sub && sub.state !== "active" && (
        <Card className={sub.state === "trial" ? "border-blue-200 bg-blue-50/60" : "border-amber-300 bg-amber-50"}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="font-semibold">
                {sub.state === "trial"
                  ? `Free trial — ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left`
                  : "Your trial has ended — editing is paused"}
              </p>
              <p className="text-sm text-muted-foreground">
                {sub.state === "trial"
                  ? "You have full access. Choose a plan before the trial ends to keep adding products and replying to orders."
                  : "Your store is still live for buyers. Activate a plan to continue editing."}
              </p>
            </div>
            <Link href="/billing" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              See plans
            </Link>
          </CardContent>
        </Card>
      )}
      {sub && sub.state === "active" && sub.daysLeft != null && sub.daysLeft <= 7 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm">
              Your <strong>{sub.effectivePlan && PLAN_DEFINITIONS[sub.effectivePlan].name}</strong> plan ends in {sub.daysLeft} day{sub.daysLeft === 1 ? "" : "s"}.
            </p>
            <Link href="/billing" className="text-sm font-medium text-blue-700 hover:underline">Renew →</Link>
          </CardContent>
        </Card>
      )}

      {remaining > 0 && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader>
            <CardTitle className="text-base">Set up your store — {steps.length - remaining} of {steps.length} done</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2 text-sm">
              {steps.map((step) => (
                <li key={step.label} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${step.done ? "bg-green-600 text-white" : "border border-stone-400 text-stone-400"}`}>
                    {step.done ? "✓" : ""}
                  </span>
                  {step.done ? (
                    <span className="text-muted-foreground line-through">{step.label}</span>
                  ) : (
                    <Link href={step.href} className="font-medium text-blue-700 hover:underline">{step.label}</Link>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

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
