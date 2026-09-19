"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SellerContactDto } from "@tradekwik/shared";
import { getSellerContact } from "@/lib/client-api";
import { useBuyerAuth } from "@/components/buyer-auth";
import { telLink, waLink } from "@/lib/format";

interface SellerContactProps {
  sellerSlug: string;
  /** Pre-filled WhatsApp message. */
  message: string;
  /** "lg" for store/about hero buttons, "md" inside a product page row. */
  size?: "md" | "lg";
}

/**
 * WhatsApp + Call buttons.
 *
 * Seller numbers are masked in every public API response, so they never reach
 * the page HTML for anonymous visitors — that is what stops bulk scraping.
 * A logged-in buyer fetches the real numbers from /sellers/:slug/contact.
 */
export function SellerContact({ sellerSlug, message, size = "lg" }: SellerContactProps) {
  const { user } = useBuyerAuth();
  const pathname = usePathname();
  const [contact, setContact] = useState<SellerContactDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) {
      setContact(null);
      return;
    }
    setLoading(true);
    setError(false);
    getSellerContact(sellerSlug)
      .then(setContact)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user, sellerSlug]);

  const pad = size === "lg" ? "px-5 py-2.5" : "px-6 py-3";
  const base = `rounded-full text-center text-sm font-semibold ${pad}`;

  // Not logged in — one button that sends them to login and back.
  if (user === null) {
    return (
      <Link
        href={`/account/login?next=${encodeURIComponent(pathname)}`}
        className={`${base} bg-green-700 text-white hover:bg-green-800`}
        title="Free account — keeps seller numbers safe from spam"
      >
        Log in to call or WhatsApp
      </Link>
    );
  }

  if (user === undefined || loading) {
    return <span className={`${base} bg-stone-100 text-stone-400`} aria-hidden>Loading…</span>;
  }

  if (error || !contact) {
    return (
      <span className={`${base} border border-stone-300 bg-white text-stone-500`}>
        Contact unavailable
      </span>
    );
  }

  return (
    <>
      <a
        href={waLink(contact.whatsappNumber, message)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} bg-green-700 text-white hover:bg-green-800`}
      >
        WhatsApp
      </a>
      <a
        href={telLink(contact.phone)}
        className={`${base} border border-stone-300 bg-white text-stone-800 hover:bg-stone-50`}
      >
        📞 {contact.phone}
      </a>
    </>
  );
}
