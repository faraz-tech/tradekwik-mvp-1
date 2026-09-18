"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
  PRIVATE_DOCUMENT_KINDS,
  type ChecklistItemDto,
  type DocumentDto,
  type DocumentKind,
  type SellerVerificationDto,
} from "@tradekwik/shared";
import {
  ApiFetchError,
  addSellerDocument,
  deleteSellerDocument,
  getSellerVerification,
  updateSellerDocument,
  uploadDocument,
} from "@/lib/api";
import { useCan } from "@/components/auth-context";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none";

const statusStyle: Record<DocumentDto["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

function DocStatus({ doc }: { doc: DocumentDto | null }) {
  if (!doc) return <Badge variant="outline">Not uploaded</Badge>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[doc.status]}`}>
      {doc.status === "pending" ? "Under review" : doc.status}
    </span>
  );
}

function UploadForm({
  defaultKind,
  onDone,
  onCancel,
}: {
  defaultKind?: DocumentKind;
  onDone: (data: SellerVerificationDto) => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<DocumentKind>(defaultKind ?? "other");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const f = new FormData(event.currentTarget);
    const file = f.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a PDF or image file.");
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadDocument(file);
      const data = await addSellerDocument({
        kind,
        title: String(f.get("title") ?? "").trim() || DOCUMENT_KIND_LABELS[kind],
        fileUrl: uploaded.url,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        isPublic: f.get("isPublic") === "on" && !PRIVATE_DOCUMENT_KINDS.includes(kind),
        issuedOn: String(f.get("issuedOn") ?? "") || null,
        expiresOn: String(f.get("expiresOn") ?? "") || null,
      });
      onDone(data);
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const isPrivateKind = PRIVATE_DOCUMENT_KINDS.includes(kind);

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-md border bg-muted/40 p-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="kind">Document type *</Label>
          <select id="kind" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>{DOCUMENT_KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder={DOCUMENT_KIND_LABELS[kind]} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="issuedOn">Issued on</Label>
          <Input id="issuedOn" name="issuedOn" type="date" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expiresOn">Expires on (if any)</Label>
          <Input id="expiresOn" name="expiresOn" type="date" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="file">File (PDF / JPEG / PNG, max 10 MB) *</Label>
        <Input id="file" name="file" type="file" accept="application/pdf,image/*" required />
      </div>
      {!isPrivateKind && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublic" className="h-4 w-4" />
          Show on my public store page once verified (good for certificates and brochures)
        </label>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Uploading…" : "Submit for review"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function DocumentsPage() {
  const canWrite = useCan("profile:write");
  const [data, setData] = useState<SellerVerificationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadFor, setUploadFor] = useState<DocumentKind | "any" | null>(null);

  const reload = useCallback(() => {
    getSellerVerification().then(setData).catch(() => setError("Could not load documents."));
  }, []);
  useEffect(reload, [reload]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const required = data.checklist.filter((c) => c.required);
  const optional = data.checklist.filter((c) => !c.required);

  async function togglePublic(doc: DocumentDto) {
    try {
      setData(await updateSellerDocument(doc.id, { isPublic: !doc.isPublic }));
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not update.");
    }
  }

  async function remove(doc: DocumentDto) {
    if (!confirm(`Remove "${doc.title}"?`)) return;
    try {
      setData(await deleteSellerDocument(doc.id));
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : "Could not remove.");
    }
  }

  function Row({ item }: { item: ChecklistItemDto }) {
    const doc = item.document;
    return (
      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {DOCUMENT_KIND_LABELS[item.kind]}
            {item.required && <span className="text-xs text-red-600">required</span>}
            <DocStatus doc={doc} />
          </p>
          {doc && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="underline">{doc.title}</a>
              {" · "}uploaded {formatDate(doc.createdAt)}
              {doc.expiresOn && ` · expires ${doc.expiresOn}`}
              {doc.isPublic && " · public"}
            </p>
          )}
          {doc?.status === "rejected" && doc.rejectionReason && (
            <p className="mt-1 text-xs text-red-700">Reason: {doc.rejectionReason}</p>
          )}
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-1">
            {doc && !PRIVATE_DOCUMENT_KINDS.includes(doc.kind) && (
              <Button size="sm" variant="ghost" onClick={() => togglePublic(doc)}>
                {doc.isPublic ? "Make private" : "Make public"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setUploadFor(item.kind)}>
              {doc ? "Re-upload" : "Upload"}
            </Button>
            {doc && doc.status !== "verified" && (
              <Button size="sm" variant="ghost" onClick={() => remove(doc)}>Remove</Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-bold">Documents & verification</h1>
        <p className="text-sm text-muted-foreground">
          Upload your compliance documents. A TradeKwik verifier checks them; when every required
          document is approved your store gets the <strong>Verified seller</strong> badge.
        </p>
      </div>

      <Card className={data.isVerified ? "border-green-300" : "border-amber-300"}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="font-semibold">
              {data.isVerified ? "✓ Verified seller" : "Not verified yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.isVerified
                ? `Verified on ${data.verifiedAt ? formatDate(data.verifiedAt) : "—"}. Keep expiring documents up to date to retain the badge.`
                : data.missingRequired.length > 0
                  ? `Still needed: ${data.missingRequired.map((k) => DOCUMENT_KIND_LABELS[k]).join(", ")}.`
                  : "All required documents uploaded — awaiting review."}
            </p>
            {data.pendingReview > 0 && (
              <p className="text-xs text-amber-700">{data.pendingReview} document(s) under review.</p>
            )}
          </div>
          {canWrite && uploadFor === null && (
            <Button size="sm" onClick={() => setUploadFor("any")}>+ Upload a document</Button>
          )}
        </CardContent>
      </Card>

      {uploadFor !== null && (
        <UploadForm
          defaultKind={uploadFor === "any" ? undefined : uploadFor}
          onDone={(d) => { setData(d); setUploadFor(null); }}
          onCancel={() => setUploadFor(null)}
        />
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Required for your business type</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {required.map((item) => <Row key={item.kind} item={item} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Optional — extra trust</CardTitle>
          <p className="text-sm text-muted-foreground">Certifications and brochures appear on your store page once verified and marked public.</p>
        </CardHeader>
        <CardContent className="grid gap-2">
          {optional.map((item) => <Row key={item.kind} item={item} />)}
        </CardContent>
      </Card>
    </div>
  );
}
