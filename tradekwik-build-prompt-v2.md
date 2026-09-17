# TradeKwik — Master Build Prompt (MVP v1, NestJS architecture)

You are helping me build **TradeKwik**, a multi-vendor B2B + B2C commerce platform for Indian small/medium businesses. Build it exactly as specified below. Ask me before deviating from this spec.

---

## 1. What we are building

A multi-tenant platform where each seller gets a public storefront and a private admin panel. Buyers discover products via SEO/search and send **inquiries or order requests** (NOT cart/checkout — no payments in v1). Inquiries are forwarded to the seller's WhatsApp and tracked in the admin panel.

**Launch sellers (seed data — create these 3 sellers with sample products):**
1. **Embroidery machine manufacturer** — sells aari embroidery machines, dori embroidery machines. High-value (₹20,000–₹2,00,000), supplies all over India. B2B + B2C. Deals close via inquiry → phone/WhatsApp negotiation.
2. **Ice cream seller** — retail (hyperlocal) + bulk party/event bookings (advance booking with date, quantity, flavors, address).
3. **Tailor/garment seller** — ready-made coat-pants and trousers (direct order) + custom stitching (inquiry/booking).

**v1 goal:** catalog + lead generation + simple order requests + seller admin. NOT full e-commerce.

---

## 2. Tech stack & architecture (fixed — do not substitute)

**Monorepo:** Turborepo + pnpm workspaces. Three independent apps — separate builds, separate deploys, separate concerns — sharing only types.

- **apps/api — NestJS (TypeScript).** The ONLY app that touches the database. Owns all business logic, validation, and auth. REST API with global `/api/v1` prefix. Swagger/OpenAPI auto-generated at `/api/docs`.
- **apps/storefront — Next.js (App Router, TypeScript).** Public, SEO-critical, lightweight. NO database access — server components fetch from the API with ISR caching.
- **apps/admin — Next.js (App Router, TypeScript).** Private dashboard for sellers + super admin. Client-heavy is fine. NO database access — calls API with JWT.
- **Database:** PostgreSQL. ORM: **Drizzle** inside apps/api (schema + migrations live in `apps/api/src/db`).
- **packages/shared** — shared TypeScript types (API request/response DTOs) and Zod schemas used by API validation and frontend forms. This is the ONLY code shared between apps.
- **Auth:** JWT via @nestjs/passport + passport-jwt in the API. Frontends store JWT (httpOnly cookie set by API preferred). Two principals: seller users and platform admins, with role claims.
- **Validation:** Zod schemas in packages/shared, used via nestjs-zod (or a Zod validation pipe) in the API and react-hook-form resolvers in admin.
- **UI:** Tailwind CSS. Admin: shadcn/ui + TanStack Table + React Hook Form. Storefront: Tailwind only, minimal dependencies.
- **Images:** API exposes an upload endpoint; storage behind a `StorageService` interface (local disk in dev; Cloudflare R2/S3 adapter later).
- **Python:** not used in v1.

Deployment target: API on Railway/Render (long-running Node server), frontends on Vercel, Neon Postgres. Everything env-driven (`.env.example` in each app).

---

## 3. Monorepo structure

```
tradekwik/
  apps/
    api/               # NestJS — port 4000
      src/
        db/            # drizzle schema, migrations, seed
        modules/
          auth/
          sellers/
          products/
          categories/
          inquiries/
          orders/
          uploads/
          admin/       # super-admin endpoints
        common/        # guards, decorators (@CurrentSeller), filters, storage service
    storefront/        # Next.js — tradekwik.com
    admin/             # Next.js — admin.tradekwik.com
  packages/
    shared/            # DTO types + zod schemas
  turbo.json
  pnpm-workspace.yaml
  README.md            # setup + run instructions for all 3 apps
```

---

## 4. Database schema (PostgreSQL via Drizzle, inside apps/api)

Use these tables. Add `created_at`, `updated_at` timestamps everywhere. UUID primary keys.

```
categories
  id, name, slug (unique), parent_id (nullable)

sellers
  id, slug (unique), business_name, category_id,
  description, city, state, address,
  phone, whatsapp_number, email,
  logo_url, cover_image_url,
  gst_number (nullable), is_verified (bool, default false),
  status (enum: pending | active | suspended),
  serves_pan_india (bool), delivery_radius_km (nullable int)

seller_users
  id, seller_id (FK), name, phone (unique), email (nullable),
  password_hash, role (enum: owner | staff)

platform_admins
  id, name, email (unique), password_hash

products
  id, seller_id (FK), category_id (FK),
  slug (unique per seller), name, description,
  specs jsonb,                    -- flexible per category (motor power / flavors / fabric)
  price_retail numeric (nullable),
  price_bulk numeric (nullable),
  min_bulk_qty int (nullable),
  price_on_request bool (default false),
  stock_status (enum: in_stock | made_to_order | out_of_stock),
  media jsonb,                    -- [{type: image|video, url, alt}]
  is_published bool (default false),
  seo_title (nullable), seo_description (nullable)

inquiries
  id, seller_id (FK), product_id (FK, nullable),
  buyer_name, buyer_phone, buyer_city (nullable),
  buyer_type (enum: personal | business),
  quantity (nullable int), message text,
  source (enum: product_page | store_page | search),
  status (enum: new | contacted | quoted | won | lost),
  seller_notes text (nullable)

order_requests                    -- ice cream bookings, ready-made garment orders
  id, seller_id (FK),
  buyer_name, buyer_phone, delivery_address text,
  order_type (enum: retail | bulk | booking),
  event_date date (nullable),
  items jsonb,                    -- [{product_id, name, qty, notes}]
  status (enum: new | confirmed | in_progress | delivered | cancelled),
  seller_notes text (nullable)
```

Indexes: sellers.slug, products.(seller_id, slug), inquiries.(seller_id, status), order_requests.(seller_id, status), products.category_id.

**Seed script** (`apps/api/src/db/seed.ts`): the 3 sellers above, 1 seller_user each (phone login), 1 platform admin, categories (Embroidery Machines, Ice Cream & Desserts, Garments & Tailoring), 4–6 realistic products per seller with specs jsonb filled in.

---

## 5. apps/api — NestJS endpoints

All responses follow `{ data, meta? }`; errors follow `{ statusCode, message, errors? }`. Validate every input with Zod schemas from packages/shared. Swagger-document everything.

### Public (no auth)
```
GET  /api/v1/categories
GET  /api/v1/sellers/:slug                       # store profile
GET  /api/v1/sellers/:slug/products              # published only
GET  /api/v1/sellers/:slug/products/:productSlug
GET  /api/v1/products?category=&q=&page=         # search/browse (Postgres ILIKE/trigram)
POST /api/v1/inquiries                           # create inquiry (rate-limited)
POST /api/v1/order-requests                      # create order/booking (rate-limited)
GET  /api/v1/sitemap-data                        # slugs + updated_at for storefront sitemap
```

### Auth
```
POST /api/v1/auth/seller/login                   # phone + password → JWT
POST /api/v1/auth/admin/login                    # email + password → JWT
GET  /api/v1/auth/me
```

### Seller (JWT, role: seller — every query scoped to token's seller_id via @CurrentSeller decorator + guard; NEVER trust client-sent seller_id)
```
GET    /api/v1/seller/dashboard                  # counts + 7-day inquiry trend
GET    /api/v1/seller/products                   # incl. unpublished
POST   /api/v1/seller/products
PATCH  /api/v1/seller/products/:id
DELETE /api/v1/seller/products/:id
GET    /api/v1/seller/inquiries?status=
PATCH  /api/v1/seller/inquiries/:id              # status, seller_notes
GET    /api/v1/seller/order-requests?status=
PATCH  /api/v1/seller/order-requests/:id
GET    /api/v1/seller/profile
PATCH  /api/v1/seller/profile
POST   /api/v1/seller/uploads                    # multipart image upload → { url }
```

### Super admin (JWT, role: admin)
```
GET    /api/v1/admin/sellers?status=
POST   /api/v1/admin/sellers                     # onboard seller + first seller_user
PATCH  /api/v1/admin/sellers/:id                 # approve / verify / suspend
GET    /api/v1/admin/inquiries
GET    /api/v1/admin/overview                    # platform stats
```

### Notifications
`NotificationsService` with `sendWhatsApp(to, message)` stubbed (logs in dev) — called on new inquiry/order. Clean interface so Interakt/AiSensy plugs in later without refactoring. Also send email to seller if email exists (nodemailer, console transport in dev).

### API conventions
- Guards: JwtAuthGuard + RolesGuard; ownership enforced in services, not just controllers
- Rate limiting on public POST endpoints (@nestjs/throttler)
- Global exception filter mapping to the error shape above
- CORS restricted to storefront + admin origins from env

---

## 6. apps/storefront (public, SEO-first)

### Routes
```
/                                  # homepage: hero, categories, featured sellers/products
/category/[slug]
/store/[sellerSlug]                # seller storefront: profile, verified badge, products, inquiry CTA
/store/[sellerSlug]/[productSlug]  # product page (the money page)
/search?q=
/inquiry/success
```

Data fetching: server components calling the API with `fetch(..., { next: { revalidate: 300 } })`. A typed API client in `lib/api.ts` using types from packages/shared.

### Product page must include
- Media gallery (images + video — video is critical for machines)
- Name, description, structured specs table (from specs jsonb)
- Price display logic: `price_on_request` → "Price on request"; retail + bulk both present → "₹X retail · ₹Y bulk (min Z units)"
- Stock status badge
- **Primary CTA: "Send Inquiry"** → form: name, phone (validated Indian mobile), city, buyer type, quantity, message → POST /inquiries
- **Secondary CTAs:** WhatsApp deep link (`https://wa.me/<seller>?text=<product name + page URL>`) and click-to-call
- Seller card linking to store page
- Ice cream/garment sellers: "Order / Book" CTA → order_request form (order type, event date if booking, items, delivery address)

### SEO requirements (non-negotiable)
- ISR for home, category, store, product pages
- `generateMetadata` per page (use seo_title/seo_description overrides when present), canonical, Open Graph
- JSON-LD: `Product` schema on product pages, `LocalBusiness` on store pages
- `sitemap.ts` built from GET /sitemap-data; `robots.ts`
- Clean slugs, `next/image` everywhere
- Lighthouse ≥ 90 mobile on product pages; server components by default, client components only for forms/gallery

### Design
Mobile-first (budget Android phones). Simple, trustworthy, fast. ₹ with Indian digit grouping (₹1,50,000), phone-first contact.

---

## 7. apps/admin (sellers + super admin)

JWT from the API (httpOnly cookie preferred); middleware guards routes; role decides seller panel vs `/super` section. All data via the typed API client — no direct DB.

### Seller panel routes
```
/login
/dashboard            # counts: new inquiries, new orders, published products; 7-day trend
/products             # TanStack table: name, price, stock, published toggle
/products/new         # form: all fields, dynamic spec key/value editor, multi-image upload
/products/[id]/edit
/inquiries            # table + status filter; detail drawer: buyer info, message,
                      #   "Reply on WhatsApp" deep-link button, status dropdown, notes
/orders               # order_requests, same pattern, status pipeline
/store-settings       # seller profile editor
```

### Super admin routes
```
/super/sellers        # approve pending, verify, suspend
/super/sellers/new    # onboard seller + first seller_user
/super/inquiries
/super/overview
```

shadcn/ui + React Hook Form + Zod resolvers (schemas from packages/shared).

---

## 8. OUT of scope for v1 (do not build)

Payments/checkout/cart, logistics integration, buyer accounts/login, reviews & ratings, chat, RFQ multi-quote system, NBFC credit, ONDC, real WhatsApp API (stub only), mobile apps, analytics beyond dashboard counts, multi-language. Leave clean extension points; do not implement.

---

## 9. Build order (one phase per session; after each phase, summarize what was built + how to test, then wait for my go-ahead)

1. **Scaffold:** Turborepo, 3 apps boot (NestJS hello + 2 Next.js), packages/shared wired, `.env.example`s, README
2. **DB + seed:** Drizzle schema, migrations, seed script — verify seeded data via a test endpoint
3. **API public endpoints:** categories, sellers, products, search, sitemap-data + Swagger docs
4. **Storefront read-only:** all public pages rendering API data with full SEO
5. **Inquiry + order flows:** API POST endpoints (rate-limited) + storefront forms + success page + notification stub
6. **API auth + seller endpoints:** JWT login, guards, seller CRUD endpoints
7. **Admin app:** login, dashboard, products CRUD, inquiries/orders management
8. **Super admin:** endpoints + pages for seller onboarding/approval, overview
9. **Polish:** search UX, empty/loading/error states, mobile QA, Lighthouse pass

---

## 10. Coding conventions

- TypeScript strict mode everywhere; no `any`
- NestJS: thin controllers, logic in services; repository-style DB access per module
- Every API input validated with Zod (packages/shared); DTO types exported for frontends
- Server components by default in Next.js; `"use client"` only where needed
- Errors: plain-language user messages; details logged server-side
- Indian formats: ₹ Indian grouping, +91 phone validation, IST dates
- Commit-sized steps with clear messages
