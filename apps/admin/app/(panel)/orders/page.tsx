"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ORDER_REQUEST_STATUSES,
  type OrderRequestStatus,
  type SellerOrderRequestDto,
} from "@tradekwik/shared";
import { listOrders, updateOrder } from "@/lib/api";
import { formatDate, waReplyLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusColors: Record<OrderRequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-purple-100 text-purple-800",
  in_progress: "bg-amber-100 text-amber-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-stone-200 text-stone-600",
};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [orders, setOrders] = useState<SellerOrderRequestDto[]>([]);
  const [selected, setSelected] = useState<SellerOrderRequestDto | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    listOrders(statusFilter || undefined)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);
  useEffect(reload, [reload]);

  async function changeStatus(status: OrderRequestStatus) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateOrder(selected.id, { status });
      setSelected(updated);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateOrder(selected.id, { sellerNotes: notes || null });
      setSelected(updated);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders & bookings</h1>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {ORDER_REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No order requests here yet.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(order);
                    setNotes(order.sellerNotes ?? "");
                  }}
                >
                  <TableCell>
                    <p className="font-medium">{order.buyerName}</p>
                    <p className="text-xs text-muted-foreground">{order.buyerPhone}</p>
                  </TableCell>
                  <TableCell className="capitalize">
                    {order.orderType}
                    {order.eventDate && (
                      <p className="text-xs text-muted-foreground">for {order.eventDate}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.items.reduce((sum, item) => sum + item.qty, 0)} item(s)
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.buyerName}</SheetTitle>
                <SheetDescription>
                  <span className="capitalize">{selected.orderType}</span>
                  {selected.eventDate ? ` · event ${selected.eventDate}` : ""} ·{" "}
                  {formatDate(selected.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-5 px-4 pb-6">
                <div className="grid gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <a href={`tel:${selected.buyerPhone}`} className="font-medium underline">
                      {selected.buyerPhone}
                    </a>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Deliver to:</span>{" "}
                    {selected.deliveryAddress}
                  </p>
                </div>

                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="mb-1 font-medium">Items</p>
                  <ul className="grid gap-1">
                    {selected.items.map((item, index) => (
                      <li key={index}>
                        {item.name} × {item.qty}
                        {item.notes && (
                          <span className="text-muted-foreground"> — {item.notes}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <a
                    href={waReplyLink(
                      selected.buyerPhone,
                      `Hi ${selected.buyerName}, about your ${selected.orderType} request on TradeKwik:`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reply on WhatsApp
                  </a>
                </Button>

                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <select
                    className={selectClass}
                    value={selected.status}
                    disabled={saving}
                    onChange={(e) => changeStatus(e.target.value as OrderRequestStatus)}
                  >
                    {ORDER_REQUEST_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="order-notes">Private notes</Label>
                  <Textarea
                    id="order-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button variant="outline" size="sm" onClick={saveNotes} disabled={saving}>
                    {saving ? "Saving…" : "Save notes"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
