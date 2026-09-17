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
  BUYER_TYPES,
  INQUIRY_SOURCES,
  INQUIRY_STATUSES,
  ORDER_REQUEST_STATUSES,
  ORDER_TYPES,
  SELLER_STATUSES,
  SELLER_USER_ROLES,
  STOCK_STATUSES,
  type OrderRequestItem,
  type ProductMediaItem,
} from '@tradekwik/shared';

// ---------- enums ----------

export const sellerStatusEnum = pgEnum('seller_status', SELLER_STATUSES);
export const sellerUserRoleEnum = pgEnum('seller_user_role', SELLER_USER_ROLES);
export const stockStatusEnum = pgEnum('stock_status', STOCK_STATUSES);
export const buyerTypeEnum = pgEnum('buyer_type', BUYER_TYPES);
export const inquirySourceEnum = pgEnum('inquiry_source', INQUIRY_SOURCES);
export const inquiryStatusEnum = pgEnum('inquiry_status', INQUIRY_STATUSES);
export const orderTypeEnum = pgEnum('order_type', ORDER_TYPES);
export const orderRequestStatusEnum = pgEnum(
  'order_request_status',
  ORDER_REQUEST_STATUSES,
);

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
    ...timestamps,
  },
  (table) => [index('sellers_status_idx').on(table.status)],
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
  ...timestamps,
});

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
    priceOnRequest: boolean('price_on_request').notNull().default(false),
    stockStatus: stockStatusEnum('stock_status').notNull().default('in_stock'),
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
  (table) => [index('inquiries_seller_status_idx').on(table.sellerId, table.status)],
);

export const orderRequests = pgTable(
  'order_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    buyerName: text('buyer_name').notNull(),
    buyerPhone: text('buyer_phone').notNull(),
    deliveryAddress: text('delivery_address').notNull(),
    orderType: orderTypeEnum('order_type').notNull().default('retail'),
    eventDate: date('event_date'),
    items: jsonb('items').$type<OrderRequestItem[]>().notNull().default([]),
    status: orderRequestStatusEnum('status').notNull().default('new'),
    sellerNotes: text('seller_notes'),
    ...timestamps,
  },
  (table) => [
    index('order_requests_seller_status_idx').on(table.sellerId, table.status),
  ],
);

// ---------- inferred row types ----------

export type Category = typeof categories.$inferSelect;
export type Seller = typeof sellers.$inferSelect;
export type SellerUser = typeof sellerUsers.$inferSelect;
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type OrderRequest = typeof orderRequests.$inferSelect;
