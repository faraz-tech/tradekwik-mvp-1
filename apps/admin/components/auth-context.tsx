"use client";

import { createContext, useContext } from "react";
import type { AdminPermission, AuthUserDto, SellerPermission } from "@tradekwik/shared";

export const AuthContext = createContext<AuthUserDto | null>(null);

/** Current panel user (seller or admin) with their permissions. */
export function useAuthUser(): AuthUserDto | null {
  return useContext(AuthContext);
}

/** True when the current user holds the permission. */
export function useCan(permission: SellerPermission | AdminPermission): boolean {
  const user = useAuthUser();
  if (!user || user.role === "buyer") return false;
  return (user.permissions as string[]).includes(permission);
}
