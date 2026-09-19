# TradeKwik — Future Development Roadmap

Planning document for everything after the MVP. It records **what** we want to build, **why**, the rough data model, and the order that makes sense. It is a living document: edit it as decisions are made. For how to run and work on the code see [DEVELOPMENT.md](DEVELOPMENT.md).

Status legend: 🟢 done · 🟡 in progress · ⚪ planned · 🔵 idea / needs decision

> **Update 2026-09-19:** phases A–H built (seller kinds + tiered pricing, company/owner profiles, sharing, roles & permissions, buyer accounts + customer dashboard, order lifecycle with transport/bilty tracking, **seller document verification and buyer business verification**). Sections below keep the original design; the status markers say what is live. Still open: phone OTP, QR codes, courier tracking APIs, order documents (invoice / e-way bill), and the parked ideas in §6.

---

## 0. Where we are today (MVP, Sept 2026)

- Public storefront: home, category, store page (type tabs, in-store search, sort, pagination), product page, search, sitemap.
- Seller admin: login, dashboard, products CRUD (with listing type), inquiries, orders, store settings.
- Super admin: seller onboarding / approval, platform overview.
- Auth: JWT for seller users and platform admins. **No buyer accounts yet.**
- Trust signals today: only an `isVerified` flag on the seller, set by the super admin.

Everything below builds on this.

---

## 1. Guiding goals

1. **Trust and confidence** — a buyer should be able to answer "who am I dealing with, are they real, can I rely on them?" from the store page alone.
2. **Transparency** — company facts, certificates, processes and people are visible, not hidden behind a chat.
3. **Traceability** — every order, document and status change has a who / when / what trail.
4. **Verification on both sides** — sellers *and* buyers are verified, so both parties can deal with less risk.

---

## 2. Feature plan

### 2.1 Seller owner details, experience and background — 🟢 done (seller admin → Owners & team; storefront `/store/<slug>/about`)

**Why:** buyers trust people before they trust companies. Showing the owner, years in business and background raises inquiry conversion.

**What to show on the store page ("About the owner" section):**

- Owner name, photo, designation (Owner / Partner / Director).
- Years of experience, year the business was founded.
- Short bio / story ("Started in a 200 sq ft unit in Surat in 2009…").
- Languages spoken (useful for buyers calling from other states).
- Optional: education, past companies, awards.

**Data model (new columns / table):**

```
seller_owners
  id, seller_id (FK), full_name, designation, photo_url, bio,
  years_experience, languages (text[]), is_primary, sort_order, timestamps
sellers
  + founded_year, + team_size_range ('1-5', '6-20', '21-50', '51-200', '200+')
```

**Admin:** new "Owner & team" tab in seller settings; super admin can view.

---

### 2.2 Company details, documents and processes — 🟢 done (company profile, process steps, social links, YouTube, premises photos, public certificates/brochures via the document flow in §2.5)

**Why:** transparency and traceability. Buyers (especially business buyers) want GST number, registration, factory photos, production process and capacity before a bulk order.

**What to show (store page "Company" section, collapsible):**

- Legal name, GSTIN, registration type (Proprietorship / Partnership / Pvt Ltd / LLP), year of registration, Udyam / MSME number.
- Factory / office address with map link; photo and video gallery of premises.
- Production capacity, lead times, minimum order quantities.
- Process description (raw material → production → QC → packing → dispatch), optionally with photos per step.
- Payment terms and accepted methods; return / warranty policy.
- Public documents: certificates, brochures, catalogues (PDF).
- **Social and video presence:** YouTube channel and embedded videos (factory tour, product demos), Instagram, Facebook, LinkedIn, X, WhatsApp Business catalogue, IndiaMART / JustDial profile links, website. Shown as an icon row in the store header and a "Watch" section with embedded YouTube players.

**Data model:**

```
seller_social_links
  id, seller_id, platform (enum: website | youtube | instagram | facebook |
       linkedin | x | whatsapp_catalogue | indiamart | justdial | other),
  url, label, sort_order, is_visible, timestamps

seller_videos
  id, seller_id, youtube_url (or video_id), title, kind (factory_tour |
       product_demo | testimonial | other), sort_order, timestamps

seller_company_profiles   (1:1 with sellers)
  seller_id, legal_name, gstin, registration_type, registration_year,
  udyam_number, capacity_note, lead_time_note, payment_terms, return_policy,
  process_steps (jsonb: [{title, description, media_url}]), timestamps

seller_documents
  id, seller_id, kind (enum: gst_certificate | udyam | incorporation | iso |
       bis | fssai | trade_license | brochure | catalogue | other),
  title, file_url, mime_type, size_bytes, is_public, issued_on, expires_on,
  verification_status (pending | verified | rejected), verified_by, verified_at,
  rejection_reason, timestamps

seller_media
  id, seller_id, kind (premises_photo | premises_video | process_photo),
  url, alt, sort_order, timestamps
```

**Notes:**

- Social links are validated per platform (host allow-list) so a seller cannot paste an arbitrary link under the "Instagram" label. YouTube embeds use `youtube-nocookie.com` and load lazily so the store page stays fast.
- Private documents (used for verification, §2.5) and public documents (brochures) share the table; `is_public` decides what the storefront can see.
- Files go through the existing `StorageService` (local in dev, S3-compatible in prod). Add a size limit and PDF/image type check.
- Sensitive numbers (GSTIN) can be shown masked to anonymous buyers and in full to verified buyers (§2.6).

---

### 2.3 Customer dashboard — 🟢 done (`/account`: overview, orders with transport/bilty details, inquiries, profile; order documents section not yet)

**Why:** buyers need one place to track inquiries, orders, logistics and documents instead of WhatsApp threads.

**Prerequisite:** buyer accounts (§2.4).

**Dashboard sections:**

| Section | Contents |
| --- | --- |
| Inquiries | all inquiries sent, seller replies, status (new / replied / quoted / closed) |
| Orders | order requests, seller confirmation, agreed price, invoice / proforma upload |
| Logistics | shipment status timeline (packed → dispatched → in transit → delivered), courier name, tracking number / link, expected date, proof of delivery |
| Documents | invoices, quotations, certificates shared by the seller for that order |
| Saved | saved sellers and products |
| Profile & verification | contact details, business details, KYC status (§2.6) |

**Data model:**

```
buyers
  id, full_name, phone (unique), email, buyer_type (personal | business),
  company_name, gstin, city, state, password_hash, verification_status, timestamps

shipments
  id, order_request_id (FK), courier_name, tracking_number, tracking_url,
  status (enum), expected_delivery_on, delivered_at, proof_url, timestamps
shipment_events
  id, shipment_id, status, note, location, created_by, created_at    -- audit trail

order_documents
  id, order_request_id, kind (quotation | proforma | invoice | other),
  file_url, uploaded_by_role, uploaded_by_id, created_at

inquiries / order_requests
  + buyer_id (nullable — guest inquiries still allowed)
```

**Storefront:** a `/account` area (login, dashboard, order detail). Inquiries and orders made while logged in are linked to the buyer automatically; guest submissions stay as today and can be claimed later by matching phone number after OTP verification.

**Seller side:** sellers update shipment status from the order detail page in the admin app. Every status change writes a `shipment_events` row — this is the traceability trail.

---

### 2.4 Roles and permissions (customer, seller, staff, admin) — 🟢 done (`packages/shared/src/permissions.ts`, `PermissionsGuard`, team management page; audit log = `order_events` for orders only so far)

**Why:** today there are two flat roles (seller user with `owner | staff`, platform admin). Buyers, seller teams with different duties, and admin teams all need finer control.

**Proposed role model (RBAC, one enum + a permission matrix in code):**

| Actor | Roles | Notes |
| --- | --- | --- |
| Buyer | `buyer` | one role; verified vs unverified is a *status*, not a role |
| Seller user | `owner`, `manager`, `sales`, `catalogue`, `logistics` | scoped to one seller; a user can belong to more than one seller later |
| Platform admin | `super_admin`, `verifier`, `support`, `finance` | `verifier` can approve documents but not delete sellers, etc. |

**Permission examples (seller scope):**

| Permission | owner | manager | sales | catalogue | logistics |
| --- | --- | --- | --- | --- | --- |
| Edit company profile & documents | ✓ | ✓ | | | |
| Manage products | ✓ | ✓ | | ✓ | |
| Reply to inquiries / orders | ✓ | ✓ | ✓ | | |
| Update shipments | ✓ | ✓ | | | ✓ |
| Invite / remove users | ✓ | | | | |

**Implementation sketch:**

- Keep JWT; add `role` and `permissions[]` claims. A NestJS `@RequirePermission('products:write')` guard replaces per-role checks.
- Single `permissions.ts` in `packages/shared` defines the matrix so admin and storefront UIs can hide what a user cannot do.
- Buyer auth: phone + OTP (SMS) as primary, password optional. Sellers keep phone + password, add OTP later.
- Audit log table (`audit_events`: actor_type, actor_id, action, entity, entity_id, diff, created_at) — needed for traceability across all roles.

---

### 2.5 Company onboarding with certificates and compliance — 🟢 done (seller admin → Documents & verification; super admin → Verification desk; badge auto-granted when all required kinds are verified and unexpired). Decisions: the checklist per seller kind lives in `SELLER_DOCUMENT_REQUIREMENTS` (code, not a config table); reviewing is done by TradeKwik staff with the `verifier` role; expiry reminders are shown in the desk (30-day window) — no automated messages yet.

**Why:** "Verified seller" must mean something. Verification becomes a documented, repeatable process instead of a checkbox.

**Onboarding flow:**

1. Seller registers (business name, phone, category, seller kind — see §2.7).
2. Uploads required documents for their kind (checklist below).
3. `verifier` admin reviews each document: approve / reject with reason. Seller sees status per document and can re-upload.
4. When all *required* documents are approved → seller status `active` and badge **Verified**. Optional documents add extra badges (e.g. **ISO 9001**, **FSSAI**).
5. Expiry: documents with `expires_on` trigger a reminder 30 days before; an expired required document downgrades the badge, not the account.

**Document checklist by seller kind (starting point, to be confirmed):**

| Document | Manufacturer | Wholesaler | Retailer |
| --- | --- | --- | --- |
| GST certificate | required | required | required |
| Udyam / MSME registration | required | optional | optional |
| PAN | required | required | required |
| Bank proof (cancelled cheque) | required | required | required |
| Factory license / pollution NOC | required | — | — |
| Trade license / shop establishment | optional | required | required |
| Product certifications (BIS, ISO, FSSAI, CE) | per category | optional | — |
| Owner ID (Aadhaar / passport, masked) | required | required | required |

**Data model:** `seller_documents` from §2.2 plus:

```
verification_requirements   -- config table, editable by super admin
  id, seller_kind, document_kind, is_required, category_id (nullable), sort_order
verification_reviews
  id, seller_document_id, reviewer_id, decision, reason, created_at
sellers
  + verification_level (none | basic | verified | premium), + verified_at
```

**Compliance extras (later):** GSTIN format + optional live check via a GST API, PAN format check, duplicate-GSTIN detection across sellers.

---

### 2.6 Customer verification — 🟡 mostly done (buyers upload GST/PAN and request review from their profile; verifier approves → `business_verified` badge shown to sellers on inquiries). **Phone OTP not built** — needs an SMS provider (open question 1).

**Why:** sellers get spam and fake bulk inquiries. A verified buyer badge lets sellers prioritise, and unlocks sensitive info (full GSTIN, bulk pricing, credit terms).

**Levels:**

| Level | How | Unlocks |
| --- | --- | --- |
| Unverified | signup with phone | browse, inquire (rate-limited) |
| Phone verified | OTP | dashboard, order tracking, saved items |
| Business verified | GSTIN + company name + optional document | "Verified business buyer" badge shown to sellers, bulk price visibility, higher inquiry limits |

**Data model:** `buyers.verification_status`, `buyer_documents` (same shape as `seller_documents`), reviews by the `verifier` role.

**Seller-facing:** inquiry list shows buyer verification badge; filter "verified buyers only".

---

### 2.7 Seller kinds: manufacturer, wholesaler, retailer — 🟢 done (badge, search filter, tiered pricing, wholesale-only listings)

**Why:** buyers search differently ("factory direct" vs "buy 1 piece"), pricing rules differ, and verification requirements differ (§2.5).

**Model:**

```
sellers
  + seller_kind (enum: manufacturer | wholesaler | retailer | service_provider)
  + secondary_kinds (enum[])   -- e.g. a manufacturer who also retails
```

**What changes by kind:**

| Area | Manufacturer | Wholesaler | Retailer |
| --- | --- | --- | --- |
| Store badge | "Manufacturer" | "Wholesaler" | "Retailer" |
| Pricing fields emphasised | bulk price, MOQ, capacity | bulk price, tiered pricing | retail price, stock |
| Profile sections | factory, process, capacity (§2.2) | warehouse, brands carried, supply area | shop location, hours |
| Search filter | ✓ filter by kind on search / category pages | | |
| Verification checklist | see §2.5 | | |

**Storefront:** kind badge next to "Verified seller"; category page filter chips for kind; product page seller card shows kind.

**Tiered pricing (wholesaler need):** replace `priceBulk + minBulkQty` with `price_tiers (jsonb: [{minQty, price}])` — keep the old fields as the first tier during migration.

---

### 2.8 One-click sharing of products and stores — 🟢 done (native share sheet + WhatsApp/Facebook/X/LinkedIn/Telegram/Email/Copy with UTM tags; QR codes and share analytics not yet)

**Why:** most buying decisions in this market are discussed with a partner, a family member or a colleague first. A share button turns one visitor into two, and shared links are the cheapest acquisition channel we have.

**Where:** product page (next to the WhatsApp / Call buttons), store page header, and later on search result cards.

**What the buyer gets:**

- A **Share** button that opens the native share sheet on mobile (`navigator.share`) with the product name, price line and URL.
- On desktop, or when native share is unavailable, a small popover with one-click targets: WhatsApp, Facebook, X, LinkedIn, Telegram, Email, and **Copy link**.
- Pre-filled message, e.g. "Aari Embroidery Machine — Single Head, ₹24,500 from Shakti Embroidery Machines (Surat). Check it on TradeKwik: {url}".
- Shared links carry `?utm_source=share&utm_medium=whatsapp` so we can measure which channels bring buyers.

**Rich previews:** product and store pages already emit Open Graph tags. Add `og:image` sizing (1200×630), `og:price:amount` / `og:price:currency` and Twitter card tags so WhatsApp, Facebook and LinkedIn show an image card.

**QR code:** product and store pages get a "Show QR" option so a seller can print it on packaging or show it at an exhibition.

**Data / tracking:**

```
share_events   (optional, for analytics)
  id, entity_type (product | store), entity_id, channel, referrer, created_at
```

No login needed; this is pure storefront work plus one small analytics endpoint. Good candidate to build early because it is independent of every other phase.

---

### 2.16 Seller contact protection — 🟢 done

Seller phone and WhatsApp numbers are **masked in every public API response** (`+9198765•••••`) and never reach the page HTML, so bots and competitors cannot scrape them. Logged-in buyers fetch the real numbers from `GET /sellers/:slug/contact` (buyer role only); anonymous visitors see a single "Log in to call or WhatsApp" button that returns them to the page afterwards. The inquiry form stays open to guests, so the low-friction path is unchanged. Sellers, admins and buyers viewing their own orders always see real numbers. `telephone` was removed from the store JSON-LD for the same reason.

---

### 2.15 Category browsing — 🟢 done

Seed ships 19 starter categories (machines, home decoration, furniture, kitchen, handicrafts, textiles, packaging, hardware, electricals, industrial, building material, agriculture, food, beauty, jewellery, footwear, stationery). Homepage shows the first six with a "View all" link to `/categories`, which lists every category (with sub-categories) and links each to its product listing at `/category/<slug>`.

---

### 2.14 Seller directory — 🟢 done

Public `/sellers` page listing every active seller with text search and filters (seller kind, category, state, verified-only), three sort orders and pagination. Featured-first ordering uses the plan flag (`PLAN_DEFINITIONS[plan].limits.featured`, trial counts as featured), so Pro/Unlimited sellers surface above Basic. Linked from the header, the homepage "Latest sellers" section and each store page.

---

### 2.13 Category management — 🟢 done

Super-admin CRUD for categories (`categories:manage` permission, super_admin only) with hide/show, sort order and one level of sub-categories; sellers submit suggestions (`category_requests`) from the product form which admins approve into real categories.

---

### 2.12 Pricing & plans — 🟡 manual billing live, Razorpay pending

Sellers are always on a paid plan after a **7-day full-access trial** that starts on approval. Plans (`PLAN_DEFINITIONS` in `packages/shared/src/schemas/billing.ts`): **Basic ₹499/mo (25 products, 2 logins)**, **Pro ₹1,499/mo (100 products, 5 logins, featured, priority verification)**, **Unlimited ₹2,999/mo (unlimited products, 20 logins)**; yearly at ~2 months off. Limits are enforced in the API (product/team creation) and a lapsed trial/plan blocks all seller mutations while reads stay open. Admins activate a plan manually after an offline payment from *Sellers → Plan* (records amount, method, reference; extends an active period). **Not yet:** Razorpay checkout and webhooks, GST invoices, automatic renewal reminders.

---

### 2.11 Mobile OTP verification — 🟢 done

Both sign-ups (buyer at `/account/register`, seller at seller-app `/register`) require the mobile number to be verified by a 6-digit OTP before the account is created. Codes are hashed and expire in 10 minutes. Defaults (all env-configurable): **2 codes per number per 24 h, 3 wrong attempts per code**, 60 s between sends, 10 codes per IP per day; a code is burned after the last wrong attempt and after one successful use. Verification yields a 15-minute token that the register endpoint checks against the phone. Provider is chosen by `OTP_PROVIDER`: `console` (dev — code is logged and shown on screen), `msg91`, or `2factor`. Buyers registering this way start as `phone_verified`.

---

### 2.10 Seller self-registration — 🟢 done

Public sign-up at `/register` in the seller app (linked from the storefront header and footer). Creates the store as `pending` with the owner login; login is refused with an "awaiting approval" message until a super admin approves it from *Sellers*. After approval the dashboard shows a setup checklist (store settings → company profile → first product → documents → Verified badge). Admin gets an email stub on each registration. Phone OTP still pending (needs SMS provider).

---

### 2.9 Order lifecycle & logistics (inquiry → delivered) — 🟢 done

Built 2026-09-19. Statuses: `new → confirmed → in_progress → ready → dispatched → delivered → completed`, plus `cancelled`.
Transitions are validated server-side (`ORDER_NEXT_STATUSES`); every change writes an `order_events` row (who, when, note, visible-to-buyer).

**The bilty flow (what the seller does at the transport office):**

1. Seller confirms the order and quotes (from an inquiry via *Convert to order*, or directly on the order).
2. Seller books the goods with a transporter, gets the **LR / bilty number**, and enters it on the order in the admin app (transporter, branch/route, LR no., vehicle, driver phone, packages, expected date, photo of the bilty).
3. Only then can the order be marked **Dispatched** — the API refuses without transport details.
4. The buyer's dashboard shows the LR number, transporter phone (one-tap call), vehicle and expected date, and gets a WhatsApp notification (stub).
5. Buyer taps **I received the goods** → order `completed`, shipment `delivered`, seller notified.

Buyers can state a preferred transporter and freight terms (to-pay / paid / included) when ordering. A `logistics` seller role can enter transport details without seeing products or inquiries.

**Not yet:** courier API tracking, e-way bill / invoice upload on the order, multi-shipment orders, buyer-side proof of delivery photo.

---

## 3. Suggested order of work

| Phase | Scope | Depends on |
| --- | --- | --- |
| A 🟢 | Seller kind (§2.7 model + badge + search filter) | — |
| B 🟢 | Company profile + owner details + public documents/media (§2.1, §2.2) | A |
| C 🟢 | Roles & permissions refactor + audit log (§2.4) | — (do before adding more actors) |
| D 🟢 | Verification workflow for sellers (§2.5) | B, C |
| E 🟡 | Buyer accounts (password; OTP later), link inquiries/orders (§2.4 buyer part) | C |
| F 🟢 | Customer dashboard: inquiries, orders, shipments (§2.3) | E |
| G 🟢 | Buyer verification review flow (§2.6) | E |
| H 🟢 | Tiered pricing, kind-specific pricing UI (§2.7) | A |
| S 🟢 | Share buttons (QR codes pending) (§2.8) | — |

A and C are small and unblock everything else; B is the visible trust win. F is the largest piece. S is independent and can be slotted in whenever a quick, visible improvement is wanted.

---

## 4. Cross-cutting requirements

- **Files:** every upload gets size/type validation, virus scan hook (later), and is stored with an owner + visibility flag. Never serve private documents from the public uploads path.
- **Audit trail:** all verification decisions, status changes and document uploads write to `audit_events`.
- **Privacy:** owner ID documents and bank proofs are visible only to `verifier` / `super_admin`; buyer phone numbers are shown to a seller only after the buyer inquires with them.
- **Notifications:** verification results, shipment updates and new inquiries go out by WhatsApp / SMS / email (notification stub exists; swap for a real provider).
- **Performance:** all lists paginate server-side (store catalogue already does; apply the same to dashboard lists).
- **Migrations:** one Drizzle migration per phase; seed data gets a verified manufacturer, a wholesaler and a retailer so every UI state has demo data.

---

## 5. Open questions (decide before the relevant phase)

1. OTP provider for India (MSG91, Twilio, Gupshup?) and cost per SMS.
2. Is buyer login required to *send* an inquiry, or stay optional? (Recommendation: optional, to keep conversion; encourage login after the first inquiry.)
3. Do we show GSTIN publicly, masked, or only to verified buyers?
4. Who performs document verification day to day — internal team or a KYC vendor?
5. Should a seller kind be single or multiple (manufacturer that also retails)? Draft above supports one primary plus secondary kinds.
6. Payment / escrow is out of scope for now — confirm this stays "deal direct" for the next phases.
7. Which social platforms are must-have at launch of §2.2? (Draft: YouTube, Instagram, Facebook, WhatsApp catalogue; others optional.)

---

## 6. Ideas parked for later — 🔵

- Reviews and ratings from verified buyers only.
- Seller response-time and fulfilment-rate metrics on the store page.
- Buyer RFQ (request for quotation) broadcast to multiple sellers in a category.
- Multi-language storefront (Hindi, Gujarati, Marathi, Tamil).
- Mobile app wrapper for the seller admin.
