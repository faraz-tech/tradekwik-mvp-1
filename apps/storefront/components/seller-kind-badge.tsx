import type { SellerKind } from "@tradekwik/shared";
import { sellerKindLabel, sellerKindStyles } from "@/lib/format";

/** "Manufacturer" / "Wholesaler" / "Retailer" pill shown next to a seller name. */
export function SellerKindBadge({ kind, className = "" }: { kind: SellerKind; className?: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sellerKindStyles[kind]} ${className}`}
    >
      {sellerKindLabel(kind)}
    </span>
  );
}
