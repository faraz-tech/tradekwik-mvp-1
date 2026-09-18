"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BUYER_DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
  type BuyerDocumentKind,
  type BuyerVerificationDto,
} from "@tradekwik/shared";
import {
  addBuyerDocument,
  ClientApiError,
  deleteBuyerDocument,
  getBuyerVerification,
  requestBuyerVerification,
  uploadDocument,
} from "@/lib/client-api";
import { useBuyerAuth } from "@/components/buyer-auth";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

const statusText = {
  unverified: { label: "Not verified", className: "bg-stone-200 text-stone-700" },
  phone_verified: { label: "Phone verified", className: "bg-blue-100 text-blue-800" },
  review_pending: { label: "Under review", className: "bg-amber-100 text-amber-800" },
  business_verified: { label: "Verified business buyer", className: "bg-green-100 text-green-800" },
} as const;

/** Business-buyer verification: upload GST / PAN, then request a review. */
export function BuyerVerification() {
  const { refresh } = useBuyerAuth();
  const [data, setData] = useState<BuyerVerificationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<BuyerDocumentKind>("gst_certificate");

  const reload = useCallback(() => {
    getBuyerVerification().then(setData).catch(() => setError("Could not load verification status."));
  }, []);
  useEffect(reload, [reload]);

  if (!data) return null;
  const s = statusText[data.status];

  async function onUpload(event: FormEvent<HTMLFormElement>) {
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
      const up = await uploadDocument(file);
      setData(
        await addBuyerDocument({
          kind,
          title: String(f.get("title") ?? "").trim() || DOCUMENT_KIND_LABELS[kind],
          fileUrl: up.url,
          mimeType: up.mimeType,
          sizeBytes: up.sizeBytes,
          isPublic: false,
        }),
      );
      (event.target as HTMLFormElement).reset();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function request() {
    setBusy(true);
    setError(null);
    try {
      setData(await requestBuyerVerification());
      await refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not send the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-900">Business verification</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
      </div>
      <p className="text-sm text-stone-600">
        Verified business buyers get a badge on their inquiries, so sellers reply faster and can
        share trade pricing. Upload your GST certificate (and optionally PAN or trade license),
        then request a review.
      </p>
      {data.reviewNote && data.status !== "business_verified" && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">Reviewer note: {data.reviewNote}</p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {data.documents.length > 0 && (
        <ul className="grid gap-2 text-sm">
          {data.documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2">
              <span>
                {DOCUMENT_KIND_LABELS[doc.kind]}:{" "}
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">{doc.title}</a>
                <span className="ml-2 text-xs capitalize text-stone-500">{doc.status}</span>
              </span>
              {doc.status !== "verified" && data.status !== "review_pending" && (
                <button
                  type="button"
                  className="text-xs text-stone-500 hover:text-red-600"
                  onClick={async () => {
                    setData(await deleteBuyerDocument(doc.id).catch(() => data));
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data.status !== "business_verified" && data.status !== "review_pending" && (
        <>
          <form onSubmit={onUpload} className="grid gap-3 rounded-lg bg-stone-50 p-4 sm:grid-cols-[180px_1fr_1fr_auto] sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Document</label>
              <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as BuyerDocumentKind)}>
                {BUYER_DOCUMENT_KINDS.map((k) => (
                  <option key={k} value={k}>{DOCUMENT_KIND_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Title</label>
              <input name="title" className={inputClass} placeholder={DOCUMENT_KIND_LABELS[kind]} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">File</label>
              <input name="file" type="file" accept="application/pdf,image/*" required className={inputClass} />
            </div>
            <button type="submit" disabled={busy} className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60">
              Upload
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || data.missing.length > 0}
              onClick={request}
              className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              Request verification
            </button>
            {data.missing.length > 0 && (
              <p className="text-xs text-stone-500">Still needed: {data.missing.join(", ")}. Save your company name and GSTIN in the profile above.</p>
            )}
          </div>
        </>
      )}
      {data.status === "review_pending" && (
        <p className="text-sm text-stone-600">Our team is reviewing your documents. You will get a WhatsApp message when it is done.</p>
      )}
    </section>
  );
}
