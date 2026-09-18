"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  FREIGHT_TERMS,
  FREIGHT_TERM_LABELS,
  INQUIRY_STATUSES,
  type InquiryStatus,
  type SellerInquiryDto,
} from "@tradekwik/shared";
import { ApiFetchError, convertInquiry, listInquiries, updateInquiry } from "@/lib/api";
import { formatDate, waReplyLink } from "@/lib/format";
import { useCan } from "@/components/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const statusColors: Record<InquiryStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  quoted: "bg-purple-100 text-purple-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-stone-200 text-stone-600",
};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

/** Turn an inquiry into a confirmed order with a quote. */
function ConvertForm({
  inquiry,
  onDone,
}: {
  inquiry: SellerInquiryDto;
  onDone: (orderId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const f = new FormData(event.currentTarget);
    const qty = Number(f.get("qty") ?? 1);
    const unitPrice = String(f.get("unitPrice") ?? "").trim();
    const freight = String(f.get("freightTerm") ?? "");
    setBusy(true);
    try {
      const order = await convertInquiry(inquiry.id, {
        orderType: qty > 1 ? "bulk" : "retail",
        items: [
          {
            productId: inquiry.productId ?? undefined,
            name: String(f.get("itemName") ?? "").trim(),
            qty,
            unitPrice: unitPrice ? Number(unitPrice) : undefined,
          },
        ],
        deliveryAddress: String(f.get("deliveryAddress") ?? "").trim(),
        quotedAmount: unitPrice ? Number(unitPrice) * qty : undefined,
        expectedDeliveryOn: String(f.get("expectedDeliveryOn") ?? "") || undefined,
        freightTerm: (freight || undefined) as never,
        buyerMessage: String(f.get("buyerMessage") ?? "").trim() || undefined,
      });
      onDone(order.id);
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not convert this inquiry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-md border bg-blue-50/40 p-3">
      <p className="text-sm font-semibold">Convert to order</p>
      <p className="text-xs text-muted-foreground">
        Creates a confirmed order for this buyer. They see it in their dashboard with your quote.
      </p>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-1">
        <Label htmlFor="itemName">Item *</Label>
        <Input id="itemName" name="itemName" required defaultValue={inquiry.productName ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label htmlFor="qty">Quantity *</Label>
          <Input id="qty" name="qty" type="number" min={1} required defaultValue={inquiry.quantity ?? 1} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="unitPrice">Unit price (₹)</Label>
          <Input id="unitPrice" name="unitPrice" type="number" min={0} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expectedDeliveryOn">Expected delivery</Label>
          <Input id="expectedDeliveryOn" name="expectedDeliveryOn" type="date" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="freightTerm">Freight</Label>
          <select id="freightTerm" name="freightTerm" className={selectClass} defaultValue="">
            <option value="">Not decided</option>
            {FREIGHT_TERMS.map((t) => (
              <option key={t} value={t}>{FREIGHT_TERM_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="deliveryAddress">Delivery address *</Label>
        <Input id="deliveryAddress" name="deliveryAddress" required defaultValue={inquiry.buyerCity ?? ""} placeholder="As agreed with the buyer" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="buyerMessage">Message to buyer</Label>
        <Input id="buyerMessage" name="buyerMessage" placeholder="e.g. 50% advance to start production" />
      </div>
      <Button type="submit" size="sm" disabled={busy} className="justify-self-start">
        {busy ? "Creating…" : "Create confirmed order"}
      </Button>
    </form>
  );
}

export default function InquiriesPage() {
  const canWrite = useCan("inquiries:write");
  const canOrder = useCan("orders:write");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [inquiries, setInquiries] = useState<SellerInquiryDto[]>([]);
  const [selected, setSelected] = useState<SellerInquiryDto | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    listInquiries(statusFilter || undefined)
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);
  useEffect(reload, [reload]);

  function openDetail(inquiry: SellerInquiryDto) {
    setSelected(inquiry);
    setNotes(inquiry.sellerNotes ?? "");
    setConverting(false);
  }

  async function changeStatus(status: InquiryStatus) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateInquiry(selected.id, { status });
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
      const updated = await updateInquiry(selected.id, { sellerNotes: notes || null });
      setSelected(updated);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inquiries</h1>
        <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {INQUIRY_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading inquiries…</p>
      ) : inquiries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inquiries here yet.</p>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow key={inquiry.id} className="cursor-pointer" onClick={() => openDetail(inquiry)}>
                  <TableCell>
                    <p className="flex items-center gap-2 font-medium">
                      {inquiry.buyerName}
                      {inquiry.buyerVerificationStatus && inquiry.buyerVerificationStatus !== "unverified" && (
                        <Badge variant="outline" className="text-[10px]">✓ {inquiry.buyerVerificationStatus.replace("_", " ")}</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inquiry.buyerPhone}
                      {inquiry.buyerCity ? ` · ${inquiry.buyerCity}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {inquiry.productName ?? <span className="text-muted-foreground">Store inquiry</span>}
                  </TableCell>
                  <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inquiry.status]}`}>
                      {inquiry.status}
                    </span>
                    {inquiry.orderId && <p className="mt-1 text-[10px] text-muted-foreground">→ order created</p>}
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
                  {selected.buyerType === "business" ? "Business buyer" : "Personal buyer"}
                  {selected.buyerCity ? ` · ${selected.buyerCity}` : ""} · {formatDate(selected.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-5 px-4 pb-6">
                <div className="grid gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <a href={`tel:${selected.buyerPhone}`} className="font-medium underline">{selected.buyerPhone}</a>
                  </p>
                  {selected.productName && (
                    <p><span className="text-muted-foreground">Product:</span> {selected.productName}</p>
                  )}
                  {selected.quantity != null && (
                    <p><span className="text-muted-foreground">Quantity:</span> {selected.quantity}</p>
                  )}
                  <p><span className="text-muted-foreground">Source:</span> {selected.source}</p>
                  {selected.buyerId ? (
                    <p className="text-xs text-green-700">Registered TradeKwik buyer — order updates reach their dashboard.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Guest inquiry (no account yet).</p>
                  )}
                </div>

                <div className="rounded-md bg-muted p-3 text-sm">{selected.message}</div>

                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <a
                    href={waReplyLink(
                      selected.buyerPhone,
                      `Hi ${selected.buyerName}, thanks for your inquiry${selected.productName ? ` about ${selected.productName}` : ""} on TradeKwik!`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reply on WhatsApp
                  </a>
                </Button>

                {selected.orderId ? (
                  <Button asChild variant="outline">
                    <Link href="/orders">View the order created from this inquiry →</Link>
                  </Button>
                ) : canOrder && !converting ? (
                  <Button variant="outline" onClick={() => setConverting(true)}>
                    Convert to order
                  </Button>
                ) : null}

                {converting && !selected.orderId && (
                  <ConvertForm
                    inquiry={selected}
                    onDone={() => {
                      setConverting(false);
                      setSelected(null);
                      reload();
                    }}
                  />
                )}

                {canWrite && (
                  <>
                    <div className="grid gap-1.5">
                      <Label>Status</Label>
                      <select
                        className={selectClass}
                        value={selected.status}
                        disabled={saving}
                        onChange={(e) => changeStatus(e.target.value as InquiryStatus)}
                      >
                        {INQUIRY_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="notes">Private notes</Label>
                      <Textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Quoted ₹22,000, follows up Monday"
                      />
                      <Button variant="outline" size="sm" onClick={saveNotes} disabled={saving}>
                        {saving ? "Saving…" : "Save notes"}
                      </Button>
                    </div>
                  </>
                )}

                <Badge variant="secondary" className="justify-self-start">
                  Inquiry ID: {selected.id.slice(0, 8)}
                </Badge>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
