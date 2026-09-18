import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  type AnyPgColumn,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  ADMIN_ROLES,
  BUYER_TYPES,
  BUYER_VERIFICATION_STATUSES,
  DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  FREIGHT_TERMS,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  LISTING_TYPES,
  ORDER_ACTOR_TYPES,
  ORDER_REQUEST_STATUSES,
  ORDER_TYPES,
  REGISTRATION_TYPES,
  SELLER_KINDS,
  SELLER_STATUSES,
  SELLER_USER_ROLES,
  SHIPMENT_STATUSES,
  STOCK_STATUSES,
  TEAM_SIZE_RANGES,
  type OrderRequestItem,
  type PriceTier,
  type ProcessStep,
  type ProductMediaItem,
  type SellerVideo,
  type SocialLink,
} from '@tradekwik/shared';

// ---------- enums ----------

export const sellerStatusEnum = pgEnum('seller_status', SELLER_STATUSES);
export const sellerKindEnum = pgEnum('seller_kind', SELLER_KINDS);
export const sellerUserRoleEnum = pgEnum('seller_user_role', SELLER_USER_ROLES);
export const adminRoleEnum = pgEnum('admin_role', ADMIN_ROLES);
export const stockStatusEnum = pgEnum('stock_status', STOCK_STATUSES);
export const listingTypeEnum = pgEnum('listing_type', LISTING_TYPES);
export const buyerTypeEnum = pgEnum('buyer_type', BUYER_TYPES);
export const buyerVerificationEnum = pgEnum('buyer_verification_status', BUYER_VERIFICATION_STATUSES);
export const inquirySourceEnum = pgEnum('inquiry_source', INQUIRY_SOURCES);
export const inquiryStatusEnum = pgEnum('inquiry_status', INQUIRY_STATUSES);
export const orderTypeEnum = pgEnum('order_type', ORDER_TYPES);
export const orderRequestStatusEnum = pgEnum('order_request_status', ORDER_REQUEST_STATUSES);
export const freightTermEnum = pgEnum('freight_term', FREIGHT_TERMS);
export const shipmentStatusEnum = pgEnum('shipment_status', SHIPMENT_STATUSES);
export const orderActorTypeEnum = pgEnum('order_actor_type', ORDER_ACTOR_TYPES);
export const registrationTypeEnum = pgEnum('registration_type', REGISTRATION_TYPES);
export const teamSizeRangeEnum = pgEnum('team_size_range', TEAM_SIZE_RANGES);
export const documentKindEnum = pgEnum('document_kind', DOCUMENT_KINDS);
export const documentStatusEnum = pgEnum('document_status', DOCUMENT_STATUSES);

// ---------- shared column helpers ----------

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------- tables ----------

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
  ...timestamps,
});

export const sellers = pgTable(
  'sellers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    businessName: text('business_name').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    sellerKind: sellerKindEnum('seller_kind').notNull().default('retailer'),
    description: text('description'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    address: text('address'),
    phone: text('phone').notNull(),
    whatsappNumber: text('whatsapp_number').notNull(),
    email: text('email'),
    logoUrl: text('logo_url'),
    coverImageUrl: text('cover_image_url'),
    gstNumber: text('gst_number'),
    isVerified: boolean('is_verified').notNull().default(false),
    status: sellerStatusEnum('status').notNull().default('pending'),
    servesPanIndia: boolean('serves_pan_india').notNull().default(false),
    deliveryRadiusKm: integer('delivery_radius_km'),
    foundedYear: integer('founded_year'),
    teamSizeRange: teamSizeRangeEnum('team_size_range'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('sellers_status_idx').on(table.status),
    index('sellers_kind_idx').on(table.sellerKind),
  ],
);

/** Company details for the public About page (1:1 with sellers). */
export const sellerProfiles = pgTable('seller_profiles', {
  sellerId: uuid('seller_id')
    .primaryKey()
    .references(() => sellers.id, { onDelete: 'cascade' }),
  legalName: text('legal_name'),
  registrationType: registrationTypeEnum('registration_type'),
  registrationYear: integer('registration_year'),
  udyamNumber: text('udyam_number'),
  capacityNote: text('capacity_note'),
  leadTimeNote: text('lead_time_note'),
  paymentTerms: text('payment_terms'),
  returnPolicy: text('return_policy'),
  processSteps: jsonb('process_steps').$type<ProcessStep[]>().notNull().default([]),
  socialLinks: jsonb('social_links').$type<SocialLink[]>().notNull().default([]),
  videos: jsonb('videos').$type<SellerVideo[]>().notNull().default([]),
  premisesPhotos: jsonb('premises_photos')
    .$type<{ url: string; alt?: string }[]>()
    .notNull()
    .default([]),
  ...timestamps,
});

/** The people behind a business — shown on the About page. */
export const sellerOwners = pgTable(
  'seller_owners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    designation: text('designation'),
    photoUrl: text('photo_url'),
    bio: text('bio'),
    yearsExperience: integer('years_experience'),
    languages: jsonb('languages').$type<string[]>().notNull().default([]),
    isPrimary: boolean('is_primary').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [index('seller_owners_seller_idx').on(table.sellerId)],
);

export const sellerUsers = pgTable('seller_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => sellers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  passwordHash: text('password_hash').notNull(),
  role: sellerUserRoleEnum('role').notNull().default('owner'),
  ...timestamps,
});

export const platformAdmins = pgTable('platform_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: adminRoleEnum('role').notNull().default('super_admin'),
  ...timestamps,
});

/** Buyer (customer) accounts. */
export const buyers = pgTable(
  'buyers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull().unique(),
    email: text('email'),
    passwordHash: text('password_hash').notNull(),
    buyerType: buyerTypeEnum('buyer_type').notNull().default('personal'),
    companyName: text('company_name'),
    gstin: text('gstin'),
    city: text('city'),
    state: text('state'),
    defaultAddress: text('default_address'),
    verificationStatus: buyerVerificationEnum('verification_status')
      .notNull()
      .default('unverified'),
    verificationRequestedAt: timestamp('verification_requested_at', { withTimezone: true }),
    verificationNote: text('verification_note'),
    ...timestamps,
  },
  (table) => [index('buyers_phone_idx').on(table.phone)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    specs: jsonb('specs').$type<Record<string, string>>().notNull().default({}),
    priceRetail: numeric('price_retail', { precision: 12, scale: 2, mode: 'number' }),
    priceBulk: numeric('price_bulk', { precision: 12, scale: 2, mode: 'number' }),
    minBulkQty: integer('min_bulk_qty'),
    priceTiers: jsonb('price_tiers').$type<PriceTier[]>().notNull().default([]),
    wholesaleOnly: boolean('wholesale_only').notNull().default(false),
    priceOnRequest: boolean('price_on_request').notNull().default(false),
    stockStatus: stockStatusEnum('stock_status').notNull().default('in_stock'),
    listingType: listingTypeEnum('listing_type').notNull().default('product'),
    media: jsonb('media').$type<ProductMediaItem[]>().notNull().default([]),
    isPublished: boolean('is_published').notNull().default(false),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('products_seller_slug_idx').on(table.sellerId, table.slug),
    index('products_category_idx').on(table.categoryId),
  ],
);

export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    buyerId: uuid('buyer_id').references(() => buyers.id, { onDelete: 'set null' }),
    buyerName: text('buyer_name').notNull(),
    buyerPhone: text('buyer_phone').notNull(),
    buyerCity: text('buyer_city'),
    buyerType: buyerTypeEnum('buyer_type').notNull().default('personal'),
    quantity: integer('quantity'),
    message: text('message').notNull(),
    source: inquirySourceEnum('source').notNull().default('product_page'),
    status: inquiryStatusEnum('status').notNull().default('new'),
    sellerNotes: text('seller_notes'),
    ...timestamps,
  },
  (table) => [
    index('inquiries_seller_status_idx').on(table.sellerId, table.status),
    index('inquiries_buyer_idx').on(table.buyerId),
  ],
);

export const orderRequests = pgTable(
  'order_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Human-friendly number shown to both sides, e.g. TK-240918-4F2A. */
    orderNumber: text('order_number')
      .notNull()
      .unique()
      .default(sql`'TK-' || upper(substring(gen_random_uuid()::text from 1 for 8))`),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    buyerId: uuid('buyer_id').references(() => buyers.id, { onDelete: 'set null' }),
    inquiryId: uuid('inquiry_id').references(() => inquiries.id, { onDelete: 'set null' }),
    buyerName: text('buyer_name').notNull(),
    buyerPhone: text('buyer_phone').notNull(),
    deliveryAddress: text('delivery_address').notNull(),
    orderType: orderTypeEnum('order_type').notNull().default('retail'),
    eventDate: date('event_date'),
    items: jsonb('items').$type<OrderRequestItem[]>().notNull().default([]),
    status: orderRequestStatusEnum('status').notNull().default('new'),
    transportPreference: text('transport_preference'),
    freightTerm: freightTermEnum('freight_term'),
    buyerNotes: text('buyer_notes'),
    quotedAmount: numeric('quoted_amount', { precision: 14, scale: 2, mode: 'number' }),
    agreedAmount: numeric('agreed_amount', { precision: 14, scale: 2, mode: 'number' }),
    expectedDeliveryOn: date('expected_delivery_on'),
    sellerNotes: text('seller_notes'),
    ...timestamps,
  },
  (table) => [
    index('order_requests_seller_status_idx').on(table.sellerId, table.status),
    index('order_requests_buyer_idx').on(table.buyerId),
  ],
);

/** Audit trail / timeline of an order. */
export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderRequestId: uuid('order_request_id')
      .notNull()
      .references(() => orderRequests.id, { onDelete: 'cascade' }),
    status: orderRequestStatusEnum('status'),
    actorType: orderActorTypeEnum('actor_type').notNull(),
    actorId: uuid('actor_id'),
    actorName: text('actor_name'),
    note: text('note'),
    visibleToBuyer: boolean('visible_to_buyer').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('order_events_order_idx').on(table.orderRequestId, table.createdAt)],
);

/** Transport booking for an order — the LR / bilty from the transporter. */
export const shipments = pgTable('shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderRequestId: uuid('order_request_id')
    .notNull()
    .unique()
    .references(() => orderRequests.id, { onDelete: 'cascade' }),
  status: shipmentStatusEnum('status').notNull().default('booked'),
  transportName: text('transport_name').notNull(),
  transportPhone: text('transport_phone'),
  transportBranch: text('transport_branch'),
  lrNumber: text('lr_number').notNull(),
  lrDocumentUrl: text('lr_document_url'),
  vehicleNumber: text('vehicle_number'),
  driverPhone: text('driver_phone'),
  packagesCount: integer('packages_count'),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  expectedDeliveryOn: date('expected_delivery_on'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  notes: text('notes'),
  ...timestamps,
});

const documentColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: documentKindEnum('kind').notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  isPublic: boolean('is_public').notNull().default(false),
  issuedOn: date('issued_on'),
  expiresOn: date('expires_on'),
  status: documentStatusEnum('status').notNull().default('pending'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  ...timestamps,
};

/** Compliance documents uploaded by a seller (GST, PAN, licenses, certificates, brochures). */
export const sellerDocuments = pgTable(
  'seller_documents',
  {
    ...documentColumns,
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
  },
  (table) => [index('seller_documents_seller_idx').on(table.sellerId, table.status)],
);

/** Documents a buyer uploads to become a verified business buyer. */
export const buyerDocuments = pgTable(
  'buyer_documents',
  {
    ...documentColumns,
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => buyers.id, { onDelete: 'cascade' }),
  },
  (table) => [index('buyer_documents_buyer_idx').on(table.buyerId, table.status)],
);

// ---------- inferred row types ----------

export type Category = typeof categories.$inferSelect;
export type Seller = typeof sellers.$inferSelect;
export type SellerProfile = typeof sellerProfiles.$inferSelect;
export type SellerOwner = typeof sellerOwners.$inferSelect;
export type SellerUser = typeof sellerUsers.$inferSelect;
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type Buyer = typeof buyers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type OrderRequest = typeof orderRequests.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type SellerDocument = typeof sellerDocuments.$inferSelect;
export type BuyerDocument = typeof buyerDocuments.$inferSelect;
