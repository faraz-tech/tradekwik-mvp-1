/**
 * Enum value lists shared between the API's DB schema, Zod DTOs, and frontend UI.
 * Single source of truth — the Drizzle pgEnums are built from these.
 */

export const SELLER_STATUSES = ['pending', 'active', 'suspended'] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

/** What kind of business a seller is. Drives badges, pricing emphasis and (later) verification checklists. */
export const SELLER_KINDS = ['manufacturer', 'wholesaler', 'retailer', 'service_provider'] as const;
export type SellerKind = (typeof SELLER_KINDS)[number];

export const SELLER_KIND_LABELS: Record<SellerKind, string> = {
  manufacturer: 'Manufacturer',
  wholesaler: 'Wholesaler',
  retailer: 'Retailer',
  service_provider: 'Service provider',
};

/**
 * Roles inside one seller account.
 * `staff` is the legacy general role (kept for existing rows) — same access as `manager` minus team management.
 */
export const SELLER_USER_ROLES = ['owner', 'staff', 'manager', 'sales', 'catalogue', 'logistics'] as const;
export type SellerUserRole = (typeof SELLER_USER_ROLES)[number];

export const SELLER_USER_ROLE_LABELS: Record<SellerUserRole, string> = {
  owner: 'Owner',
  staff: 'Staff (general)',
  manager: 'Manager',
  sales: 'Sales',
  catalogue: 'Catalogue',
  logistics: 'Logistics',
};

/** Platform (TradeKwik) admin roles. */
export const ADMIN_ROLES = ['super_admin', 'verifier', 'support'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const STOCK_STATUSES = ['in_stock', 'made_to_order', 'out_of_stock'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

/** What kind of listing a product row is — drives the tabs on a store page. */
export const LISTING_TYPES = ['product', 'tool', 'accessory', 'service'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  product: 'Products',
  tool: 'Tools',
  accessory: 'Accessories',
  service: 'Services',
};

export const BUYER_TYPES = ['personal', 'business'] as const;
export type BuyerType = (typeof BUYER_TYPES)[number];

/** Buyer account verification level. */
export const BUYER_VERIFICATION_STATUSES = [
  'unverified',
  'phone_verified',
  'review_pending',
  'business_verified',
] as const;
export type BuyerVerificationStatus = (typeof BUYER_VERIFICATION_STATUSES)[number];

export const INQUIRY_SOURCES = ['product_page', 'store_page', 'search'] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export const INQUIRY_STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const ORDER_TYPES = ['retail', 'bulk', 'booking'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

/**
 * Order lifecycle (inquiry → final delivery):
 * new → confirmed → in_progress → ready → dispatched → delivered → completed
 * `cancelled` can happen from any non-final state.
 */
export const ORDER_REQUEST_STATUSES = [
  'new',
  'confirmed',
  'in_progress',
  'ready',
  'dispatched',
  'delivered',
  'completed',
  'cancelled',
] as const;
export type OrderRequestStatus = (typeof ORDER_REQUEST_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderRequestStatus, string> = {
  new: 'Request received',
  confirmed: 'Confirmed by seller',
  in_progress: 'In production / being prepared',
  ready: 'Ready to dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Statuses in the order they appear on a timeline (cancelled is shown separately). */
export const ORDER_TIMELINE: readonly OrderRequestStatus[] = [
  'new',
  'confirmed',
  'in_progress',
  'ready',
  'dispatched',
  'delivered',
  'completed',
];

/** Allowed status transitions for the seller. */
export const ORDER_NEXT_STATUSES: Record<OrderRequestStatus, readonly OrderRequestStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'ready', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready: ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

/** Who pays the transporter. `to_pay` = buyer pays on delivery (common in Indian goods transport). */
export const FREIGHT_TERMS = ['to_pay', 'paid', 'included'] as const;
export type FreightTerm = (typeof FREIGHT_TERMS)[number];

export const FREIGHT_TERM_LABELS: Record<FreightTerm, string> = {
  to_pay: 'To pay (buyer pays transporter on delivery)',
  paid: 'Paid by seller (charged separately)',
  included: 'Included in price',
};

export const SHIPMENT_STATUSES = ['booked', 'in_transit', 'delivered'] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Who did something on an order (event trail). */
export const ORDER_ACTOR_TYPES = ['buyer', 'seller', 'admin', 'system'] as const;
export type OrderActorType = (typeof ORDER_ACTOR_TYPES)[number];

/** Compliance / trust documents a seller or buyer can upload. */
export const DOCUMENT_KINDS = [
  'gst_certificate',
  'pan',
  'udyam',
  'incorporation',
  'bank_proof',
  'factory_license',
  'trade_license',
  'iso',
  'bis',
  'fssai',
  'ce',
  'owner_id',
  'brochure',
  'catalogue',
  'other',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  gst_certificate: 'GST certificate',
  pan: 'PAN card',
  udyam: 'Udyam / MSME registration',
  incorporation: 'Incorporation / partnership deed',
  bank_proof: 'Bank proof (cancelled cheque)',
  factory_license: 'Factory license / pollution NOC',
  trade_license: 'Trade license / shop establishment',
  iso: 'ISO certificate',
  bis: 'BIS certificate',
  fssai: 'FSSAI license',
  ce: 'CE / other product certification',
  owner_id: 'Owner ID (Aadhaar / passport)',
  brochure: 'Brochure',
  catalogue: 'Catalogue / price list',
  other: 'Other document',
};

/** Kinds that are meaningful to publish on the store page once verified. */
export const PUBLISHABLE_DOCUMENT_KINDS: readonly DocumentKind[] = [
  'gst_certificate', 'udyam', 'iso', 'bis', 'fssai', 'ce', 'brochure', 'catalogue', 'other',
];

/** Kinds that must never be public (identity / banking). */
export const PRIVATE_DOCUMENT_KINDS: readonly DocumentKind[] = ['pan', 'bank_proof', 'owner_id'];

export const DOCUMENT_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Which documents each seller kind must / may upload to earn the Verified badge.
 * `required: true` = badge is withheld until it is verified.
 */
export const SELLER_DOCUMENT_REQUIREMENTS: Record<
  SellerKind,
  readonly { kind: DocumentKind; required: boolean }[]
> = {
  manufacturer: [
    { kind: 'gst_certificate', required: true },
    { kind: 'pan', required: true },
    { kind: 'udyam', required: true },
    { kind: 'bank_proof', required: true },
    { kind: 'factory_license', required: true },
    { kind: 'owner_id', required: true },
    { kind: 'trade_license', required: false },
    { kind: 'iso', required: false },
    { kind: 'bis', required: false },
    { kind: 'fssai', required: false },
    { kind: 'ce', required: false },
    { kind: 'brochure', required: false },
    { kind: 'catalogue', required: false },
  ],
  wholesaler: [
    { kind: 'gst_certificate', required: true },
    { kind: 'pan', required: true },
    { kind: 'bank_proof', required: true },
    { kind: 'trade_license', required: true },
    { kind: 'owner_id', required: true },
    { kind: 'udyam', required: false },
    { kind: 'iso', required: false },
    { kind: 'fssai', required: false },
    { kind: 'catalogue', required: false },
  ],
  retailer: [
    { kind: 'gst_certificate', required: true },
    { kind: 'pan', required: true },
    { kind: 'bank_proof', required: true },
    { kind: 'trade_license', required: true },
    { kind: 'owner_id', required: true },
    { kind: 'udyam', required: false },
    { kind: 'fssai', required: false },
    { kind: 'catalogue', required: false },
  ],
  service_provider: [
    { kind: 'pan', required: true },
    { kind: 'owner_id', required: true },
    { kind: 'bank_proof', required: true },
    { kind: 'gst_certificate', required: false },
    { kind: 'udyam', required: false },
    { kind: 'trade_license', required: false },
    { kind: 'brochure', required: false },
  ],
};

/** What a buyer uploads to become a verified business buyer. */
export const BUYER_DOCUMENT_KINDS = ['gst_certificate', 'pan', 'trade_license', 'other'] as const;
export type BuyerDocumentKind = (typeof BUYER_DOCUMENT_KINDS)[number];

/** Social / video platforms a seller can link on the company page. */
export const SOCIAL_PLATFORMS = [
  'website',
  'youtube',
  'instagram',
  'facebook',
  'linkedin',
  'x',
  'whatsapp_catalogue',
  'indiamart',
  'justdial',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  website: 'Website',
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  whatsapp_catalogue: 'WhatsApp catalogue',
  indiamart: 'IndiaMART',
  justdial: 'JustDial',
};

export const REGISTRATION_TYPES = [
  'proprietorship',
  'partnership',
  'llp',
  'private_limited',
  'other',
] as const;
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const REGISTRATION_TYPE_LABELS: Record<RegistrationType, string> = {
  proprietorship: 'Proprietorship',
  partnership: 'Partnership',
  llp: 'LLP',
  private_limited: 'Private Limited',
  other: 'Other',
};

export const TEAM_SIZE_RANGES = ['1-5', '6-20', '21-50', '51-200', '200+'] as const;
export type TeamSizeRange = (typeof TEAM_SIZE_RANGES)[number];

/** Shape of one entry in products.media (jsonb). */
export interface ProductMediaItem {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

/** One quantity break: `price` per unit when ordering at least `minQty`. */
export interface PriceTier {
  minQty: number;
  price: number;
}

/** Shape of one entry in order_requests.items (jsonb). */
export interface OrderRequestItem {
  productId?: string;
  name: string;
  qty: number;
  notes?: string;
  /** Unit price agreed for this line (set by the seller when quoting). */
  unitPrice?: number;
}

/** One production / service process step on the company page. */
export interface ProcessStep {
  title: string;
  description?: string;
  mediaUrl?: string;
}

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface SellerVideo {
  /** Full YouTube URL; the storefront extracts the id. */
  url: string;
  title?: string;
}
