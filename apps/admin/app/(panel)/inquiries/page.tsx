"use client";

import { useCallback, useEffect, useState } from "react";
import {
  INQUIRY_STATUSES,
  type InquiryStatus,
  type SellerInquiryDto,
} from "@tradekwik/shared";
import { listInquiries, updateInquiry } from "@/lib/api";
import { formatDate, waReplyLink } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function InquiriesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [inquiries, setInquiries] = useState<SellerInquiryDto[]>([]);
  const [selected, setSelected] = useState<SellerInquiryDto | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {INQUIRY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
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
                <TableRow
                  key={inquiry.id}
                  className="cursor-pointer"
                  onClick={() => openDetail(inquiry)}
                >
                  <TableCell>
                    <p className="font-medium">{inquiry.buyerName}</p>
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inquiry.status]}`}
                    >
                      {inquiry.status}
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
                  {selected.buyerType === "business" ? "Business buyer" : "Personal buyer"}
                  {selected.buyerCity ? ` · ${selected.buyerCity}` : ""} ·{" "}
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
                  {selected.productName && (
                    <p>
                      <span className="text-muted-foreground">Product:</span>{" "}
                      {selected.productName}
                    </p>
                  )}
                  {selected.quantity != null && (
                    <p>
                      <span className="text-muted-foreground">Quantity:</span> {selected.quantity}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Source:</span> {selected.source}
                  </p>
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

                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <select
                    className={selectClass}
                    value={selected.status}
                    disabled={saving}
                    onChange={(e) => changeStatus(e.target.value as InquiryStatus)}
                  >
                    {INQUIRY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
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
