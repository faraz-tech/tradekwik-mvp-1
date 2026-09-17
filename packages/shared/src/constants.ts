/**
 * Enum value lists shared between the API's DB schema, Zod DTOs, and frontend UI.
 * Single source of truth — the Drizzle pgEnums are built from these.
 */

export const SELLER_STATUSES = ['pending', 'active', 'suspended'] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

export const SELLER_USER_ROLES = ['owner', 'staff'] as const;
export type SellerUserRole = (typeof SELLER_USER_ROLES)[number];

export const STOCK_STATUSES = ['in_stock', 'made_to_order', 'out_of_stock'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const BUYER_TYPES = ['personal', 'business'] as const;
export type BuyerType = (typeof BUYER_TYPES)[number];

export const INQUIRY_SOURCES = ['product_page', 'store_page', 'search'] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export const INQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const ORDER_TYPES = ['retail', 'bulk', 'booking'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_REQUEST_STATUSES = [
  'new',
  'confirmed',
  'in_progress',
  'delivered',
  'cancelled',
] as const;
export type OrderRequestStatus = (typeof ORDER_REQUEST_STATUSES)[number];

/** Shape of one entry in products.media (jsonb). */
export interface ProductMediaItem {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

/** Shape of one entry in order_requests.items (jsonb). */
export interface OrderRequestItem {
  productId?: string;
  name: string;
  qty: number;
  notes?: string;
}
