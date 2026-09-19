import Image from "next/image";
import Link from "next/link";
import type { SellerListItemDto } from "@tradekwik/shared";
import { SellerKindBadge } from "@/components/seller-kind-badge";

/** Seller tile used on the directory and the homepage. */
export function SellerCard({ seller }: { seller: SellerListItemDto }) {
  return (
    <Link
      href={`/store/${seller.slug}`}
      className="flex gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      {seller.logoUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
          <Image src={seller.logoUrl} alt="" fill sizes="48px" className="object-cover" />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-lg font-semibold text-stone-500">
          {seller.businessName.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium text-stone-900">
          {seller.businessName}
          {seller.isVerified && (
            <span
              title="Documents checked by TradeKwik"
              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
            >
              ✓ Verified
            </span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <SellerKindBadge kind={seller.sellerKind} />
          <span>
            {seller.city}, {seller.state}
            {seller.foundedYear ? ` · Since ${seller.foundedYear}` : ""}
          </span>
        </p>
        {seller.description && (
          <p className="mt-2 line-clamp-2 text-sm text-stone-600">{seller.description}</p>
        )}
        <p className="mt-2 text-xs text-stone-500">
          {seller.productCount} listing{seller.productCount === 1 ? "" : "s"}
          {seller.servesPanIndia ? " · Delivers all over India" : ""}
        </p>
      </div>
    </Link>
  );
}
