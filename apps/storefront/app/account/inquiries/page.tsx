"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BuyerInquiryDto, InquiryStatus } from "@tradekwik/shared";
import { listBuyerInquiries } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

const statusLabel: Record<InquiryStatus, { label: string; className: string }> = {
  new: { label: "Sent", className: "bg-blue-100 text-blue-800" },
  contacted: { label: "Seller contacted you", className: "bg-amber-100 text-amber-800" },
  quoted: { label: "Quoted", className: "bg-purple-100 text-purple-800" },
  won: { label: "Converted to order", className: "bg-green-100 text-green-800" },
  lost: { label: "Closed", className: "bg-stone-200 text-stone-600" },
};

export default function AccountInquiriesPage() {
  const [items, setItems] = useState<BuyerInquiryDto[] | null>(null);

  useEffect(() => {
    listBuyerInquiries().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold text-stone-900">Inquiries</h1>
      {items === null ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">You have not sent any inquiries yet.</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((inq) => {
            const s = statusLabel[inq.status];
            return (
              <li key={inq.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/store/${inq.seller.slug}`} className="font-medium text-stone-900 hover:text-blue-700">
                    {inq.seller.businessName}
                  </Link>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>
                </div>
                {inq.productName && (
                  <p className="text-sm text-stone-600">
                    {inq.productSlug ? (
                      <Link href={`/store/${inq.seller.slug}/${inq.productSlug}`} className="hover:underline">{inq.productName}</Link>
                    ) : (
                      inq.productName
                    )}
                    {inq.quantity != null && ` · qty ${inq.quantity}`}
                  </p>
                )}
                <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{inq.message}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                  <span>Sent {formatDate(inq.createdAt)}</span>
                  {inq.orderId && (
                    <Link href={`/account/orders/${inq.orderId}`} className="font-medium text-blue-700 hover:underline">
                      View order →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
