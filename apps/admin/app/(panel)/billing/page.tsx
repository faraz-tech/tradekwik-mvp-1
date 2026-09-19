"use client";

import { useEffect, useState } from "react";
import {
  PLANS,
  PLAN_DEFINITIONS,
  TRIAL_DAYS,
  type SellerSubscriptionDto,
} from "@tradekwik/shared";
import { getSubscription } from "@/lib/api";
import { useAuthUser } from "@/components/auth-context";
import { formatDate, formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "919876500000";

export default function BillingPage() {
  const me = useAuthUser();
  const [sub, setSub] = useState<SellerSubscriptionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"month" | "year">("year");

  useEffect(() => {
    getSubscription().then(setSub).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!sub) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const business = me?.role === "seller" ? me.businessName : "";
  const waHref = (plan: string) =>
    `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
      `Hi TradeKwik, I want to activate the ${plan} plan (${cycle === "year" ? "yearly" : "monthly"}) for ${business}. Please share payment details.`,
    )}`;

  const banner =
    sub.state === "trial"
      ? { cls: "border-blue-200 bg-blue-50", title: `Free trial — ${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"} left`, body: `You have full Unlimited access until ${sub.currentPeriodEndsAt ? formatDate(sub.currentPeriodEndsAt) : ""}. Pick a plan before it ends to keep editing your store.` }
      : sub.state === "active"
        ? { cls: "border-green-200 bg-green-50", title: `${PLAN_DEFINITIONS[sub.effectivePlan!].name} plan — active`, body: `Renews or ends on ${sub.currentPeriodEndsAt ? formatDate(sub.currentPeriodEndsAt) : ""} (${sub.daysLeft} days left).` }
        : { cls: "border-amber-300 bg-amber-50", title: "Your trial has ended", body: "Your store is still visible to buyers and you can view everything, but adding or editing is paused until a plan is active." };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & plan</h1>
        <p className="text-sm text-muted-foreground">
          Every seller gets a {TRIAL_DAYS}-day full-access trial, then a paid plan.
        </p>
      </div>

      <Card className={banner.cls}>
        <CardContent className="grid gap-1 pt-6">
          <p className="font-semibold">{banner.title}</p>
          <p className="text-sm text-muted-foreground">{banner.body}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Usage: {sub.usage.products} product{sub.usage.products === 1 ? "" : "s"} · {sub.usage.teamMembers} team login{sub.usage.teamMembers === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Billing:</span>
        {(["month", "year"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${cycle === c ? "bg-primary text-primary-foreground" : "border bg-background"}`}
          >
            {c === "month" ? "Monthly" : "Yearly (save ~2 months)"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((id) => {
          const plan = PLAN_DEFINITIONS[id];
          const current = sub.state === "active" && sub.effectivePlan === id;
          const price = cycle === "month" ? plan.priceMonthly : plan.priceYearly;
          return (
            <Card key={id} className={current ? "border-primary" : id === "pro" ? "border-blue-200" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {plan.name}
                  {current && <Badge>Current</Badge>}
                  {!current && id === "pro" && <Badge variant="secondary">Popular</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p>
                  <span className="text-3xl font-bold">{formatINR(price)}</span>
                  <span className="text-sm text-muted-foreground"> / {cycle} + GST</span>
                </p>
                <ul className="grid gap-1 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h}>✓ {h}</li>
                  ))}
                </ul>
                <div className="grid gap-2">
                  <Button asChild className="bg-green-600 hover:bg-green-700">
                    <a href={waHref(plan.name)} target="_blank" rel="noopener noreferrer">
                      {current ? "Renew via WhatsApp" : "Activate via WhatsApp"}
                    </a>
                  </Button>
                  <Button variant="outline" disabled title="Online payment is coming soon">
                    Pay online — coming soon
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        How it works today: message us on WhatsApp, pay by UPI or bank transfer, and we activate your plan within a few hours.
        Online payment with Razorpay is being added.
      </p>

      {sub.history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-1">Plan</th><th className="py-1">Period</th><th className="py-1">Paid</th><th className="py-1">Reference</th></tr>
              </thead>
              <tbody>
                {sub.history.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="py-1.5">{PLAN_DEFINITIONS[g.plan].name} ({g.cycle}ly)</td>
                    <td className="py-1.5">{formatDate(g.startsAt)} → {formatDate(g.endsAt)}</td>
                    <td className="py-1.5">{g.amountPaid != null ? formatINR(g.amountPaid) : "—"}{g.paymentMethod ? ` · ${g.paymentMethod.replace("_", " ")}` : ""}</td>
                    <td className="py-1.5 text-muted-foreground">{g.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
