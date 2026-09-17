/** Claims carried in the JWT. */
export interface JwtPayload {
  /** seller_users.id or platform_admins.id */
  sub: string;
  role: 'seller' | 'admin';
  /** present only for sellers — the tenant every query is scoped to */
  sellerId?: string;
}
