"use client";

import Link from "next/link";
import { useBuyerAuth } from "@/components/buyer-auth";

/** Header link: "Log in" when anonymous, "My account" when a buyer is signed in. */
export function AccountNav() {
  const { user } = useBuyerAuth();
  if (user === undefined) return <span className="h-5 w-16" aria-hidden />;
  if (!user) {
    return (
      <Link
        href="/account/login"
        className="rounded-full border border-stone-300 px-3.5 py-1.5 text-sm font-medium text-stone-700 hover:border-blue-400 hover:text-blue-700"
      >
        Log in
      </Link>
    );
  }
  return (
    <Link
      href="/account"
      className="rounded-full bg-stone-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-stone-700"
    >
      My account
    </Link>
  );
}
