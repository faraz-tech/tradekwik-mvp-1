"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  PAYMENT_METHODS,
  PLANS,
  PLAN_DEFINITIONS,
  type AdminSellerDto,
  type SellerSubscriptionDto,
} from "@tradekwik/shared";
import { ApiFetchError, adminExtendTrial, adminGetSubscription, adminGrantPlan, adminRevokeGrant } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

export const stateStyle: Record<SellerSubscriptionDto["state"], string> = {
  trial: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-amber-100 text-amber-800",
  none: "bg-stone-200 text-stone-700",
};

/** Admin-side: activate / extend a plan after an offline payment, or extend the trial. */
export function PlanDialog({
  seller,
  onClose,
  onChanged,
}: {
  seller: AdminSellerDto | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [sub, setSub] = useState<SellerSubscriptionDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("basic");
  const [cycle, setCycle] = useState<"month" | "year">("month");

  useEffect(() => {
    if (!seller) return;
    setSub(null);
    setError(null);
    adminGetSubscription(seller.id).then(setSub).catch((e: Error) => setError(e.message));
  }, [seller]);

  const price = cycle === "month" ? PLAN_DEFINITIONS[plan].priceMonthly : PLAN_DEFINITIONS[plan].priceYearly;

  async function onGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!seller) return;
    const f = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      setSub(
        await adminGrantPlan(seller.id, {
          plan,
          cycle,
          amountPaid: Number(f.get("amountPaid") ?? price) || undefined,
          paymentMethod: String(f.get("paymentMethod") ?? "upi") as never,
          reference: String(f.get("reference") ?? "").trim() || undefined,
          note: String(f.get("note") ?? "").trim() || undefined,
        }),
      );
      onChanged();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not activate the plan.");
    } finally {
      setBusy(false);
    }
  }

  async function onExtendTrial(days: number) {
    if (!seller) return;
    setBusy(true);
    setError(null);
    try {
      setSub(await adminExtendTrial(seller.id, { days }));
      onChanged();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not extend the trial.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(grantId: string) {
    if (!seller || !confirm("Remove this grant? The seller loses that period immediately.")) return;
    setBusy(true);
    try {
      setSub(await adminRevokeGrant(seller.id, grantId));
      onChanged();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not remove the grant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={seller !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {seller && (
          <>
            <SheetHeader>
              <SheetTitle>Plan — {seller.businessName}</SheetTitle>
              <SheetDescription>Record an offline payment and activate a plan, or extend the trial.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-5 px-4 pb-6">
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              {sub && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${stateStyle[sub.state]}`}>{sub.state}</span>
                    {sub.effectivePlan && PLAN_DEFINITIONS[sub.effectivePlan].name}
                    {sub.daysLeft != null && <span className="text-muted-foreground">· {sub.daysLeft} days left</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trial ends {sub.trialEndsAt ? formatDate(sub.trialEndsAt) : "—"} · {sub.usage.products} products · {sub.usage.teamMembers} logins
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onExtendTrial(7)}>+7 days trial</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onExtendTrial(30)}>+30 days trial</Button>
                  </div>
                </div>
              )}

              <form onSubmit={onGrant} className="grid gap-3 rounded-md border bg-muted/40 p-3">
                <p className="text-sm font-semibold">Activate plan (offline payment)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label>Plan</Label>
                    <select className={selectClass} value={plan} onChange={(e) => setPlan(e.target.value as never)}>
                      {PLANS.map((p) => (
                        <option key={p} value={p}>{PLAN_DEFINITIONS[p].name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label>Period</Label>
                    <select className={selectClass} value={cycle} onChange={(e) => setCycle(e.target.value as never)}>
                      <option value="month">1 month</option>
                      <option value="year">1 year</option>
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="amountPaid">Amount received (₹)</Label>
                    <Input id="amountPaid" name="amountPaid" type="number" min={0} key={`${plan}-${cycle}`} defaultValue={price} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="paymentMethod">Method</Label>
                    <select id="paymentMethod" name="paymentMethod" className={selectClass} defaultValue="upi">
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1 col-span-2">
                    <Label htmlFor="reference">Payment reference (UTR / UPI id)</Label>
                    <Input id="reference" name="reference" />
                  </div>
                  <div className="grid gap-1 col-span-2">
                    <Label htmlFor="note">Note</Label>
                    <Input id="note" name="note" placeholder="e.g. launch discount" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sub?.state === "active" ? "The seller already has an active period — this will be added after it ends." : "Starts now."}
                </p>
                <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : `Activate ${PLAN_DEFINITIONS[plan].name} for 1 ${cycle}`}</Button>
              </form>

              {sub && sub.history.length > 0 && (
                <div className="grid gap-2 text-sm">
                  <p className="font-semibold">History</p>
                  {sub.history.map((g) => (
                    <div key={g.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
                      <div>
                        <p>
                          <Badge variant="outline">{PLAN_DEFINITIONS[g.plan].name}</Badge>{" "}
                          {formatDate(g.startsAt)} → {formatDate(g.endsAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {g.amountPaid != null ? formatINR(g.amountPaid) : "—"} · {g.paymentMethod ?? "—"} {g.reference ? `· ${g.reference}` : ""} {g.grantedByName ? `· by ${g.grantedByName}` : ""}
                        </p>
                        {g.note && <p className="text-xs">{g.note}</p>}
                      </div>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => onRevoke(g.id)}>Remove</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
