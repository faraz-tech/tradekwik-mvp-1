import type { AdminRole, SellerUserRole } from '@tradekwik/shared';

export type PrincipalRole = 'seller' | 'admin' | 'buyer';

/** Claims carried in the JWT. */
export interface JwtPayload {
  /** seller_users.id, platform_admins.id or buyers.id */
  sub: string;
  role: PrincipalRole;
  /** sellers only — the tenant every query is scoped to */
  sellerId?: string;
  /** sellers only — role inside the seller account (drives permissions) */
  sellerUserRole?: SellerUserRole;
  /** admins only */
  adminRole?: AdminRole;
}

/** Cookie names: buyers get their own cookie so a seller and a buyer can be logged in on the same browser (dev). */
export const AUTH_COOKIE = 'token';
export const BUYER_COOKIE = 'buyer_token';
