"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  SELLER_KIND_LABELS,
  SELLER_STATUSES,
  type AdminSellerDto,
  type SellerStatus,
} from "@tradekwik/shared";
import { adminListSellers, adminUpdateSeller } from "@/lib/api";
import { PlanDialog, stateStyle } from "@/components/plan-dialog";
import { PLAN_DEFINITIONS } from "@tradekwik/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<SellerStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-700",
};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

export default function SellersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sellers, setSellers] = useState<AdminSellerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [planFor, setPlanFor] = useState<AdminSellerDto | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    adminListSellers(statusFilter || undefined)
      .then(setSellers)
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);
  useEffect(reload, [reload]);

  async function patch(seller: AdminSellerDto, input: Parameters<typeof adminUpdateSeller>[1]) {
    setBusy(seller.id);
    try {
      await adminUpdateSeller(seller.id, input);
      reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sellers</h1>
        <div className="flex items-center gap-3">
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {SELLER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button asChild>
            <Link href="/super/sellers/new">+ Onboard seller</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading sellers…</p>
      ) : sellers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sellers found.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell>
                    <p className="flex items-center gap-2 font-medium">
                      {seller.businessName}
                      {seller.isVerified && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          ✓ Verified
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SELLER_KIND_LABELS[seller.sellerKind]} · /{seller.slug} · {seller.city}, {seller.state}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{seller.ownerName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{seller.ownerPhone ?? ""}</p>
                  </TableCell>
                  <TableCell>{seller.productCount}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setPlanFor(seller)}
                      className="text-left"
                      title="Manage plan"
                    >
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateStyle[seller.subscription.state]}`}>
                        {seller.subscription.state}
                      </span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {seller.subscription.effectivePlan ? PLAN_DEFINITIONS[seller.subscription.effectivePlan].name : "no plan"}
                        {seller.subscription.currentPeriodEndsAt && ` · till ${new Date(seller.subscription.currentPeriodEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </p>
                    </button>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[seller.status]}`}
                    >
                      {seller.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPlanFor(seller)}>
                        Plan
                      </Button>
                      {seller.status === "pending" && (
                        <Button
                          size="sm"
                          disabled={busy === seller.id}
                          onClick={() => patch(seller, { status: "active" })}
                        >
                          Approve
                        </Button>
                      )}
                      {seller.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === seller.id}
                          onClick={() => patch(seller, { isVerified: !seller.isVerified })}
                        >
                          {seller.isVerified ? "Unverify" : "Verify"}
                        </Button>
                      )}
                      {seller.status !== "suspended" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === seller.id}
                          onClick={() => patch(seller, { status: "suspended" })}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === seller.id}
                          onClick={() => patch(seller, { status: "active" })}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlanDialog seller={planFor} onClose={() => setPlanFor(null)} onChanged={reload} />
    </div>
  );
}
