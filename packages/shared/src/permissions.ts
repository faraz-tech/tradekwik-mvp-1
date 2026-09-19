import type { AdminRole, SellerUserRole } from "./constants.js";

/**
 * Permission matrix — the single place that says who may do what.
 * The API enforces it (PermissionsGuard); the admin UI uses it to hide
 * what the current user cannot do.
 */

export const SELLER_PERMISSIONS = [
  "dashboard:read",
  "products:read",
  "products:write",
  "inquiries:read",
  "inquiries:write",
  "orders:read",
  "orders:write",
  "shipments:write",
  "profile:read",
  "profile:write",
  "team:manage",
] as const;
export type SellerPermission = (typeof SELLER_PERMISSIONS)[number];

const ALL_SELLER: readonly SellerPermission[] = SELLER_PERMISSIONS;

export const SELLER_ROLE_PERMISSIONS: Record<SellerUserRole, readonly SellerPermission[]> = {
  owner: ALL_SELLER,
  manager: ALL_SELLER.filter((p) => p !== "team:manage"),
  staff: ALL_SELLER.filter((p) => p !== "team:manage" && p !== "profile:write"),
  sales: [
    "dashboard:read",
    "products:read",
    "inquiries:read",
    "inquiries:write",
    "orders:read",
    "orders:write",
    "profile:read",
  ],
  catalogue: ["dashboard:read", "products:read", "products:write", "profile:read"],
  logistics: ["dashboard:read", "orders:read", "shipments:write", "profile:read"],
};

export const ADMIN_PERMISSIONS = [
  "overview:read",
  "sellers:read",
  "sellers:write",
  "sellers:verify",
  "inquiries:read",
  "buyers:read",
  "buyers:verify",
  "categories:manage",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ADMIN_PERMISSIONS,
  verifier: ["overview:read", "sellers:read", "sellers:verify", "buyers:read", "buyers:verify"],
  support: ["overview:read", "sellers:read", "inquiries:read", "buyers:read"],
};

export function sellerRoleHas(role: SellerUserRole, permission: SellerPermission): boolean {
  return SELLER_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function adminRoleHas(role: AdminRole, permission: AdminPermission): boolean {
  return ADMIN_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
