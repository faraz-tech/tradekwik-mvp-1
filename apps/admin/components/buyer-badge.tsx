import type { BuyerVerificationStatus } from "@tradekwik/shared";

interface BuyerBadgeProps {
  /** Null when the inquiry/order came from someone without an account. */
  buyerId: string | null;
  verificationStatus?: BuyerVerificationStatus | null;
  className?: string;
}

const STYLES = {
  guest: { label: "Guest", cls: "bg-stone-200 text-stone-700", title: "No TradeKwik account — the number is unverified." },
  registered: { label: "✓ Registered", cls: "bg-blue-100 text-blue-800", title: "Has a TradeKwik account with an OTP-verified mobile number." },
  pending: { label: "✓ Registered · business review", cls: "bg-amber-100 text-amber-900", title: "Registered buyer; business verification is being reviewed." },
  business: { label: "✓ Verified business", cls: "bg-green-100 text-green-800", title: "Registered buyer with a verified business (GST checked)." },
} as const;

/** Tells the seller at a glance whether a lead came from a logged-in buyer or a guest. */
export function BuyerBadge({ buyerId, verificationStatus, className = "" }: BuyerBadgeProps) {
  const key = !buyerId
    ? "guest"
    : verificationStatus === "business_verified"
      ? "business"
      : verificationStatus === "review_pending"
        ? "pending"
        : "registered";
  const s = STYLES[key];
  return (
    <span
      title={s.title}
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls} ${className}`}
    >
      {s.label}
    </span>
  );
}
