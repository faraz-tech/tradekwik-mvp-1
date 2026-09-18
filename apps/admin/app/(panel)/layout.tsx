"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SELLER_USER_ROLE_LABELS,
  type AdminPermission,
  type AuthUserDto,
  type SellerPermission,
} from "@tradekwik/shared";
import { logout, me, ApiFetchError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/components/auth-context";

interface NavItem {
  href: string;
  label: string;
  /** Shown only when the user holds this permission. */
  permission?: SellerPermission | AdminPermission;
}

const SELLER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard:read" },
  { href: "/products", label: "Products", permission: "products:read" },
  { href: "/inquiries", label: "Inquiries", permission: "inquiries:read" },
  { href: "/orders", label: "Orders", permission: "orders:read" },
  { href: "/company-profile", label: "Company profile", permission: "profile:read" },
  { href: "/owners", label: "Owners & team", permission: "profile:read" },
  { href: "/documents", label: "Documents & verification", permission: "profile:read" },
  { href: "/store-settings", label: "Store settings", permission: "profile:read" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/super/overview", label: "Overview", permission: "overview:read" },
  { href: "/super/sellers", label: "Sellers", permission: "sellers:read" },
  { href: "/super/verification", label: "Verification desk", permission: "sellers:verify" },
  { href: "/super/inquiries", label: "Inquiries", permission: "inquiries:read" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUserDto | null>(null);

  useEffect(() => {
    me()
      .then((u) => {
        if (u.role === "buyer") {
          router.replace("/login");
          return;
        }
        setUser(u);
      })
      .catch((error) => {
        if (error instanceof ApiFetchError && error.status === 401) {
          router.replace("/login");
        }
      });
  }, [router]);

  // keep each role in its own section
  useEffect(() => {
    if (!user) return;
    const inSuper = pathname.startsWith("/super");
    if (user.role === "admin" && !inSuper) router.replace("/super/overview");
    if (user.role === "seller" && inSuper) router.replace("/dashboard");
  }, [user, pathname, router]);

  const permissions = new Set<string>(user && user.role !== "buyer" ? user.permissions : []);
  const NAV = (user?.role === "admin" ? ADMIN_NAV : SELLER_NAV).filter(
    (item) => !item.permission || permissions.has(item.permission),
  );

  async function onLogout() {
    await logout().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  const subtitle =
    user?.role === "seller"
      ? `${user.businessName} · ${SELLER_USER_ROLE_LABELS[user.sellerUserRole]}`
      : user?.role === "admin"
        ? `Platform admin · ${user.adminRole.replace("_", " ")}`
        : "";

  return (
    <AuthContext.Provider value={user}>
      <div className="flex min-h-screen bg-muted/30">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-background p-4 sm:flex">
          <p className="px-2 text-lg font-bold">
            Trade<span className="text-blue-700">Kwik</span>
          </p>
          <p className="mt-1 truncate px-2 text-xs text-muted-foreground" title={subtitle}>
            {subtitle}
          </p>
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
          <p className="mb-2 truncate px-2 text-xs text-muted-foreground">{user?.name}</p>
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
    </AuthContext.Provider>
  );
}
