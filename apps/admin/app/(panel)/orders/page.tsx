"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FREIGHT_TERMS,
  FREIGHT_TERM_LABELS,
  ORDER_NEXT_STATUSES,
  ORDER_REQUEST_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_TIMELINE,
  type OrderRequestStatus,
  type SellerOrderDetailDto,
  type SellerOrderRequestDto,
  type UpsertShipmentInput,
} from "@tradekwik/shared";
import { ApiFetchError, getOrder, listOrders, updateOrder, uploadImage, upsertShipment } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatINR,
  orderStatusColors,
  orderStatusLabel,
  waReplyLink,
} from "@/lib/format";
import { useCan } from "@/components/auth-context";
import { BuyerBadge } from "@/components/buyer-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

function StatusPill({ status }: { status: OrderRequestStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${orderStatusColors[status]}`}>
      {orderStatusLabel(status)}
    </span>
  );
}

/** Horizontal lifecycle stepper. */
function Stepper({ status }: { status: OrderRequestStatus }) {
  if (status === "cancelled") {
    return <p className="text-sm font-medium text-stone-600">This order was cancelled.</p>;
  }
  const current = ORDER_TIMELINE.indexOf(status);
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {ORDER_TIMELINE.map((step, index) => {
        const done = index <= current;
        return (
          <li
            key={step}
            className={`flex items-center gap-1 rounded-full px-2 py-1 ${
              done ? "bg-blue-700 text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            <span>{index + 1}</span>
            <span className="hidden sm:inline">{ORDER_STATUS_LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ShipmentForm({
  order,
  onSaved,
}: {
  order: SellerOrderDetailDto;
  onSaved: (updated: SellerOrderDetailDto) => void;
}) {
  const s = order.shipment;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lrDocumentUrl, setLrDocumentUrl] = useState<string | null>(s?.lrDocumentUrl ?? null);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setLrDocumentUrl(url);
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const f = new FormData(event.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim() || null;
    const input: UpsertShipmentInput = {
      transportName: String(f.get("transportName") ?? "").trim(),
      transportPhone: str("transportPhone"),
      transportBranch: str("transportBranch"),
      lrNumber: String(f.get("lrNumber") ?? "").trim(),
      lrDocumentUrl,
      vehicleNumber: str("vehicleNumber"),
      driverPhone: str("driverPhone"),
      packagesCount: str("packagesCount") ? Number(str("packagesCount")) : null,
      expectedDeliveryOn: str("expectedDeliveryOn"),
      notes: str("notes"),
      status: s?.status ?? "booked",
    };
    setSaving(true);
    try {
      onSaved(await upsertShipment(order.id, input));
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not save transport details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-md border bg-amber-50/40 p-3">
      <p className="text-sm font-semibold">
        🚚 Transport / bilty details {s ? "(update)" : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        After booking with the transporter, enter the LR (bilty) number here. The buyer sees it
        in their dashboard and gets a WhatsApp update. Required before marking dispatched.
      </p>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="transportName">Transport company *</Label>
          <Input id="transportName" name="transportName" required defaultValue={s?.transportName ?? ""} placeholder="e.g. VRL Logistics" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="lrNumber">LR / bilty number *</Label>
          <Input id="lrNumber" name="lrNumber" required defaultValue={s?.lrNumber ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="transportBranch">Branch / route</Label>
          <Input id="transportBranch" name="transportBranch" defaultValue={s?.transportBranch ?? ""} placeholder="Surat → Pune (Market Yard)" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="transportPhone">Transport phone</Label>
          <Input id="transportPhone" name="transportPhone" defaultValue={s?.transportPhone ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="vehicleNumber">Vehicle number</Label>
          <Input id="vehicleNumber" name="vehicleNumber" defaultValue={s?.vehicleNumber ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="driverPhone">Driver phone</Label>
          <Input id="driverPhone" name="driverPhone" defaultValue={s?.driverPhone ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="packagesCount">No. of packages</Label>
          <Input id="packagesCount" name="packagesCount" type="number" min={1} defaultValue={s?.packagesCount ?? ""} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expectedDeliveryOn">Expected delivery</Label>
          <Input id="expectedDeliveryOn" name="expectedDeliveryOn" type="date" defaultValue={s?.expectedDeliveryOn ?? ""} />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="lrDoc">Photo of the bilty</Label>
        <Input id="lrDoc" type="file" accept="image/*" disabled={uploading} onChange={(e) => onUpload(e.target.files?.[0])} />
        {lrDocumentUrl && (
          <a href={lrDocumentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">
            View uploaded bilty
          </a>
        )}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="shipNotes">Notes for buyer</Label>
        <Input id="shipNotes" name="notes" defaultValue={s?.notes ?? ""} placeholder="e.g. freight to-pay at destination branch" />
      </div>
      <Button type="submit" size="sm" disabled={saving || uploading} className="justify-self-start">
        {saving ? "Saving…" : s ? "Update transport details" : "Save transport details"}
      </Button>
    </form>
  );
}

function OrderDetail({
  order,
  onChange,
}: {
  order: SellerOrderDetailDto;
  onChange: (updated: SellerOrderDetailDto) => void;
}) {
  const canWrite = useCan("orders:write");
  const canShip = useCan("shipments:write");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(order.sellerNotes ?? "");
  const [message, setMessage] = useState("");
  const [quoted, setQuoted] = useState(order.quotedAmount?.toString() ?? "");
  const [agreed, setAgreed] = useState(order.agreedAmount?.toString() ?? "");
  const [eta, setEta] = useState(order.expectedDeliveryOn ?? "");
  const [freight, setFreight] = useState(order.freightTerm ?? "");

  useEffect(() => {
    setNotes(order.sellerNotes ?? "");
    setQuoted(order.quotedAmount?.toString() ?? "");
    setAgreed(order.agreedAmount?.toString() ?? "");
    setEta(order.expectedDeliveryOn ?? "");
    setFreight(order.freightTerm ?? "");
  }, [order]);

  async function run(fn: () => Promise<SellerOrderDetailDto>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const next = ORDER_NEXT_STATUSES[order.status];
  const total = order.items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.qty, 0);

  return (
    <div className="grid gap-5 px-4 pb-6">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Stepper status={order.status} />

      <div className="grid gap-1 text-sm">
        <p>
          <span className="text-muted-foreground">Phone:</span>{" "}
          <a href={`tel:${order.buyerPhone}`} className="font-medium underline">{order.buyerPhone}</a>
          <BuyerBadge
            buyerId={order.buyerId}
            verificationStatus={order.buyerVerificationStatus}
            className="ml-2"
          />
        </p>
        <p><span className="text-muted-foreground">Deliver to:</span> {order.deliveryAddress}</p>
        {order.transportPreference && (
          <p><span className="text-muted-foreground">Buyer prefers transport:</span> {order.transportPreference}</p>
        )}
        {order.buyerNotes && <p><span className="text-muted-foreground">Buyer notes:</span> {order.buyerNotes}</p>}
        {order.inquiryId && <p className="text-xs text-muted-foreground">Created from an inquiry.</p>}
      </div>

      <div className="rounded-md bg-muted p-3 text-sm">
        <p className="mb-1 font-medium">Items</p>
        <ul className="grid gap-1">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-2">
              <span>
                {item.name} × {item.qty}
                {item.notes && <span className="text-muted-foreground"> — {item.notes}</span>}
              </span>
              {item.unitPrice != null && <span>{formatINR(item.unitPrice * item.qty)}</span>}
            </li>
          ))}
        </ul>
        {total > 0 && <p className="mt-2 text-right font-medium">Items total {formatINR(total)}</p>}
      </div>

      <Button asChild className="bg-green-600 hover:bg-green-700">
        <a
          href={waReplyLink(order.buyerPhone, `Hi ${order.buyerName}, about your order ${order.orderNumber} on TradeKwik:`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Reply on WhatsApp
        </a>
      </Button>

      {canWrite && (
        <div className="grid gap-3 rounded-md border p-3">
          <p className="text-sm font-semibold">Quote & delivery</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label>Quoted amount (₹)</Label>
              <Input type="number" min={0} value={quoted} onChange={(e) => setQuoted(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Agreed amount (₹)</Label>
              <Input type="number" min={0} value={agreed} onChange={(e) => setAgreed(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Expected delivery</Label>
              <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Freight</Label>
              <select className={selectClass} value={freight} onChange={(e) => setFreight(e.target.value)}>
                <option value="">Not decided</option>
                {FREIGHT_TERMS.map((t) => (
                  <option key={t} value={t}>{FREIGHT_TERM_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            className="justify-self-start"
            onClick={() =>
              run(() =>
                updateOrder(order.id, {
                  quotedAmount: quoted ? Number(quoted) : null,
                  agreedAmount: agreed ? Number(agreed) : null,
                  expectedDeliveryOn: eta || null,
                  freightTerm: (freight || null) as never,
                }),
              )
            }
          >
            Save quote
          </Button>
        </div>
      )}

      {canWrite && next.length > 0 && (
        <div className="grid gap-2 rounded-md border p-3">
          <p className="text-sm font-semibold">Move order forward</p>
          <div className="flex flex-wrap gap-2">
            {next.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === "cancelled" ? "ghost" : "default"}
                disabled={busy}
                onClick={() => {
                  if (status === "cancelled" && !confirm("Cancel this order?")) return;
                  run(() => updateOrder(order.id, { status, buyerMessage: message || undefined }));
                }}
              >
                {status === "cancelled" ? "Cancel order" : `Mark: ${ORDER_STATUS_LABELS[status]}`}
              </Button>
            ))}
          </div>
          <Input
            placeholder="Optional message to the buyer with this update"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      )}

      {(canShip || canWrite) && order.status !== "cancelled" && order.status !== "completed" && (
        <ShipmentForm order={order} onSaved={onChange} />
      )}

      {order.shipment && (
        <div className="grid gap-1 rounded-md border p-3 text-sm">
          <p className="font-semibold">Booked transport</p>
          <p>{order.shipment.transportName} · LR {order.shipment.lrNumber}</p>
          {order.shipment.vehicleNumber && <p>Vehicle {order.shipment.vehicleNumber}</p>}
          {order.shipment.expectedDeliveryOn && <p>Expected {order.shipment.expectedDeliveryOn}</p>}
          <p className="text-xs capitalize text-muted-foreground">{order.shipment.status.replace("_", " ")}</p>
        </div>
      )}

      {canWrite && (
        <div className="grid gap-1.5">
          <Label htmlFor="order-notes">Private notes (not shown to buyer)</Label>
          <Textarea id="order-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            className="justify-self-start"
            onClick={() => run(() => updateOrder(order.id, { sellerNotes: notes || null }))}
          >
            Save notes
          </Button>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Timeline</p>
        <ol className="grid gap-2 border-l pl-3 text-sm">
          {order.events.map((event) => (
            <li key={event.id}>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)} · {event.actorName ?? event.actorType}
                {!event.visibleToBuyer && " · private"}
              </p>
              {event.status && <StatusPill status={event.status} />}
              {event.note && <p className="mt-0.5">{event.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [orders, setOrders] = useState<SellerOrderRequestDto[]>([]);
  const [selected, setSelected] = useState<SellerOrderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listOrders(statusFilter || undefined)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);
  useEffect(reload, [reload]);

  async function open(order: SellerOrderRequestDto) {
    setSelected(await getOrder(order.id).catch(() => null));
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders & bookings</h1>
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {ORDER_REQUEST_STATUSES.map((status) => (
            <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>
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
                <TableHead>Order</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer" onClick={() => open(order)}>
                  <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                  <TableCell>
                    <p className="font-medium">{order.buyerName}</p>
                    <p className="text-xs text-muted-foreground">{order.buyerPhone}</p>
                  </TableCell>
                  <TableCell>
                    <BuyerBadge
                      buyerId={order.buyerId}
                      verificationStatus={order.buyerVerificationStatus}
                    />
                  </TableCell>
                  <TableCell className="capitalize">
                    {order.orderType}
                    {order.eventDate && <p className="text-xs text-muted-foreground">for {order.eventDate}</p>}
                  </TableCell>
                  <TableCell>{order.agreedAmount != null ? formatINR(order.agreedAmount) : order.quotedAmount != null ? `${formatINR(order.quotedAmount)} (quoted)` : "—"}</TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell><StatusPill status={order.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && (setSelected(null), reload())}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.orderNumber} · {selected.buyerName}
                </SheetTitle>
                <SheetDescription>
                  <span className="capitalize">{selected.orderType}</span>
                  {selected.eventDate ? ` · event ${selected.eventDate}` : ""} · {formatDate(selected.createdAt)}
                </SheetDescription>
              </SheetHeader>
              <OrderDetail order={selected} onChange={setSelected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
