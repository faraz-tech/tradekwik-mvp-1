"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUserDto } from "@tradekwik/shared";
import { logout, me, ApiFetchError } from "@/lib/api";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/inquiries", label: "Inquiries" },
  { href: "/orders", label: "Orders" },
  { href: "/store-settings", label: "Store settings" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUserDto | null>(null);

  useEffect(() => {
    me()
      .then(setUser)
      .catch((error) => {
        if (error instanceof ApiFetchError && error.status === 401) {
          router.replace("/login");
        }
      });
  }, [router]);

  async function onLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background p-4 sm:flex">
        <p className="px-2 text-lg font-bold">
          Trade<span className="text-blue-700">Kwik</span>
        </p>
        {user?.role === "seller" && (
          <p className="mt-1 truncate px-2 text-xs text-muted-foreground">
            {user.businessName}
          </p>
        )}
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Log out
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top nav */}
        <header className="flex items-center gap-2 overflow-x-auto border-b bg-background px-4 py-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ${
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </header>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
