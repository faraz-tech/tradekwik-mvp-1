"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useBuyerAuth } from "@/components/buyer-auth";

const PUBLIC = new Set(["/account/login", "/account/register"]);

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders & delivery" },
  { href: "/account/inquiries", label: "Inquiries" },
  { href: "/account/profile", label: "Profile" },
];

/** Auth guard + side navigation for the customer dashboard. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useBuyerAuth();
  const isPublic = PUBLIC.has(pathname);

  useEffect(() => {
    if (user === null && !isPublic) {
      router.replace(`/account/login?next=${encodeURIComponent(pathname)}`);
    }
    if (user && isPublic) router.replace("/account");
  }, [user, isPublic, pathname, router]);

  if (isPublic) return <main className="mx-auto max-w-md px-4 py-10">{children}</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-stone-500">Loading your account…</main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <p className="truncate font-semibold text-stone-900">{user.name}</p>
          <p className="truncate text-xs text-stone-500">{user.phone}</p>
          <nav className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map((item) => {
              const active = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
            className="mt-4 text-sm text-stone-500 hover:text-red-600"
          >
            Log out
          </button>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
