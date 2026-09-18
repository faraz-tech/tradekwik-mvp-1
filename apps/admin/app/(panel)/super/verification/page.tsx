"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DOCUMENT_KIND_LABELS,
  SELLER_KIND_LABELS,
  type AdminBuyerVerificationDto,
  type AdminSellerVerificationDto,
  type DocumentDto,
  type VerificationQueueDto,
} from "@tradekwik/shared";
import {
  ApiFetchError,
  adminReviewBuyer,
  adminReviewDocument,
  adminVerificationQueue,
} from "@/lib/api";
import { useCan } from "@/components/auth-context";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statusStyle: Record<DocumentDto["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

function DocumentRow({
  doc,
  onReview,
  busy,
}: {
  doc: DocumentDto;
  onReview: (doc: DocumentDto, status: "verified" | "rejected", reason?: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {DOCUMENT_KIND_LABELS[doc.kind]}{" "}
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[doc.status]}`}>
              {doc.status}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="underline">{doc.title}</a>
            {" · "}{Math.round(doc.sizeBytes / 1024)} KB · uploaded {formatDate(doc.createdAt)}
            {doc.issuedOn && ` · issued ${doc.issuedOn}`}
            {doc.expiresOn && ` · expires ${doc.expiresOn}`}
          </p>
          {doc.rejectionReason && <p className="text-xs text-red-700">Rejected: {doc.rejectionReason}</p>}
        </div>
        {doc.status === "pending" && (
          <div className="flex gap-1">
            <Button size="sm" disabled={busy} onClick={() => onReview(doc, "verified")}>Approve</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting((v) => !v)}>Reject</Button>
          </div>
        )}
      </div>
      {rejecting && (
        <div className="flex gap-2">
          <Input placeholder="Reason shown to the seller" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={() => onReview(doc, "rejected", reason.trim())}>
            Confirm reject
          </Button>
        </div>
      )}
    </div>
  );
}

function SellerCard({
  seller,
  onChange,
}: {
  seller: AdminSellerVerificationDto;
  onChange: (updated: AdminSellerVerificationDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(seller.pendingCount > 0);

  async function review(doc: DocumentDto, status: "verified" | "rejected", reason?: string) {
    setBusy(true);
    setError(null);
    try {
      onChange(await adminReviewDocument(doc.id, { status, rejectionReason: reason }));
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {seller.businessName}
          <Badge variant="outline">{SELLER_KIND_LABELS[seller.sellerKind]}</Badge>
          {seller.isVerified ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Not verified</Badge>
          )}
          {seller.pendingCount > 0 && <Badge>{seller.pendingCount} to review</Badge>}
          {seller.expiringSoon > 0 && <Badge variant="destructive">{seller.expiringSoon} expiring</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          /{seller.slug}
          {seller.missingRequired.length > 0 &&
            ` · missing: ${seller.missingRequired.map((k) => DOCUMENT_KIND_LABELS[k]).join(", ")}`}
        </p>
      </CardHeader>
      {open && (
        <CardContent className="grid gap-2">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {seller.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            seller.documents.map((doc) => <DocumentRow key={doc.id} doc={doc} onReview={review} busy={busy} />)
          )}
        </CardContent>
      )}
    </Card>
  );
}

function BuyerCard({
  buyer,
  onChange,
}: {
  buyer: AdminBuyerVerificationDto;
  onChange: (updated: AdminBuyerVerificationDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      onChange(await adminReviewBuyer(buyer.buyerId, { decision, note: note.trim() || undefined }));
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {buyer.fullName}
          <Badge variant="outline">{buyer.status.replace("_", " ")}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {buyer.phone} · {buyer.companyName ?? "no company"} · GSTIN {buyer.gstin ?? "—"} · {buyer.city ?? ""}
          {buyer.requestedAt && ` · requested ${formatDate(buyer.requestedAt)}`}
        </p>
      </CardHeader>
      <CardContent className="grid gap-2">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {buyer.documents.map((doc) => (
          <p key={doc.id} className="text-sm">
            {DOCUMENT_KIND_LABELS[doc.kind]}:{" "}
            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="underline">{doc.title}</a>
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${statusStyle[doc.status]}`}>{doc.status}</span>
          </p>
        ))}
        {buyer.status === "review_pending" && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Note to buyer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" disabled={busy} onClick={() => decide("approve")}>Approve business buyer</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("reject")}>Reject</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerificationPage() {
  const canSellers = useCan("sellers:verify");
  const canBuyers = useCan("buyers:verify");
  const [queue, setQueue] = useState<VerificationQueueDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    adminVerificationQueue().then(setQueue).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!queue) return <p className="text-sm text-muted-foreground">Loading queue…</p>;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold">Verification desk</h1>
        <p className="text-sm text-muted-foreground">
          Approve or reject uploaded documents. A seller becomes Verified automatically when every
          required document for their business type is approved.
        </p>
      </div>

      {canSellers && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Sellers ({queue.sellers.length})</h2>
          {queue.sellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to review.</p>
          ) : (
            queue.sellers.map((seller) => (
              <SellerCard
                key={seller.sellerId}
                seller={seller}
                onChange={(updated) =>
                  setQueue((q) =>
                    q ? { ...q, sellers: q.sellers.map((s) => (s.sellerId === updated.sellerId ? updated : s)) } : q,
                  )
                }
              />
            ))
          )}
        </section>
      )}

      {canBuyers && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Buyers awaiting business verification ({queue.buyers.length})</h2>
          {queue.buyers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests.</p>
          ) : (
            queue.buyers.map((buyer) => (
              <BuyerCard
                key={buyer.buyerId}
                buyer={buyer}
                onChange={(updated) =>
                  setQueue((q) =>
                    q ? { ...q, buyers: q.buyers.map((b) => (b.buyerId === updated.buyerId ? updated : b)) } : q,
                  )
                }
              />
            ))
          )}
        </section>
      )}
    </div>
  );
}
