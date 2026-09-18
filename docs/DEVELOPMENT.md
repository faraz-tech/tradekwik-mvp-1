# TradeKwik — Development Guide

Everything you need to run, test, and work on this project. For a project overview see the [README](../README.md); for the product spec see [tradekwik-build-prompt-v2.md](../tradekwik-build-prompt-v2.md). For what comes after the MVP see [ROADMAP.md](ROADMAP.md).

---

## 1. Quick reference

### URLs (dev)

| What | URL |
| --- | --- |
| Storefront (public site) | http://localhost:3000 |
| Admin panel (sellers + super admin) | http://localhost:3001 |
| API base | http://localhost:4000/api/v1 |
| **Swagger UI (interactive API docs)** | http://localhost:4000/api/docs |
| API health check | http://localhost:4000/api/v1/health |
| DB sanity check (row counts) | http://localhost:4000/api/v1/health/db |
| Uploaded images | http://localhost:4000/uploads/\<filename\> |
| Sitemap / robots | http://localhost:3000/sitemap.xml · /robots.txt |

### Dev logins (from seed data — dev only)

| Who | Where | Login | Password |
| --- | --- | --- | --- |
| Seller owner — Shakti Embroidery (manufacturer) | http://localhost:3001 | phone `9876500001` | `seller123` |
| Seller owner — Meltz Ice Cream (retailer) | http://localhost:3001 | phone `9876500002` | `seller123` |
| Seller owner — Perfect Fit Tailors (retailer) | http://localhost:3001 | phone `9876500003` | `seller123` |
| Seller owner — Gujarat Thread & Trims (wholesaler) | http://localhost:3001 | phone `9876500004` | `seller123` |
| Seller staff — Shakti, **logistics** role (orders + transport only) | http://localhost:3001 | phone `9876500011` | `seller123` |
| Super admin | http://localhost:3001 (Admin tab) | `admin@tradekwik.com` | `admin123` |
| Verifier (documents & buyer verification only) | http://localhost:3001 (Admin tab) | `verifier@tradekwik.com` | `admin123` |
| Buyer — Priya Sharma (has 2 demo orders, one in transit with a bilty) | http://localhost:3000/account/login | phone `9876500099` | `buyer123` |

Seller and buyer sessions use different cookies (`token` vs `buyer_token`), so you can be logged in as both in one browser.

### Key flows to try

1. **Order lifecycle:** log in as buyer → `/account/orders` → open the dispatched order → see LR/bilty, call transporter, confirm receipt.
2. **Seller side:** log in as Shakti owner → Inquiries → *Convert to order* → Orders → quote → mark ready → enter transport details (bilty) → mark dispatched.
3. **Roles:** log in as the logistics staff (`9876500011`) — only Dashboard and Orders are visible; product APIs return 403.
4. **Trust pages:** http://localhost:3000/store/shakti-embroidery-machines/about (company, people, process, videos). Edit via seller admin → *Company profile* and *Owners & team*.
5. **Wholesale:** http://localhost:3000/search?kind=wholesaler and the Gujarat Thread store — tiered pricing, wholesale-only listings, minimum quantities.
6. **Seller sign-up:** http://localhost:3001/register — creates a *pending* store; approve it under super admin → Sellers, then log in with the chosen mobile number. The dashboard shows a setup checklist.
7. **Verification:** log in as the verifier → *Verification desk* — Gujarat Thread has pending documents and Priya has requested business verification. Approve them and watch the Verified badge appear on the store and the buyer's profile. Sellers upload under *Documents & verification*.

## 2. First-time setup

```bash
# 1. install dependencies for the whole workspace (run at repo root)
pnpm install

# 2. create env files from the examples
cp apps/api/.env.example apps/api/.env
cp apps/storefront/.env.example apps/storefront/.env.local
cp apps/admin/.env.example apps/admin/.env.local

# 3. put your Postgres password into apps/api/.env (DATABASE_URL)

# 4. create tables and demo data
pnpm --filter @tradekwik/api db:migrate
pnpm --filter @tradekwik/api db:seed

# 5. run it
pnpm dev
```

Prerequisites: Node ≥ 22 (built on 24 LTS), pnpm ≥ 10 (`npm install -g pnpm`), PostgreSQL 15+ running locally (or the Docker alternative — see §4).

---

## 3. Running the apps

```bash
pnpm dev                                   # all apps at once, prefixed logs

# individually (each in its own terminal if you prefer)
pnpm --filter @tradekwik/api dev           # NestJS with file watching
pnpm --filter @tradekwik/storefront dev    # Next dev server, port 3000
pnpm --filter @tradekwik/admin dev         # Next dev server, port 3001

# production-style run (after pnpm build)
pnpm --filter @tradekwik/api start:prod
pnpm --filter @tradekwik/storefront start
pnpm --filter @tradekwik/admin start
```

Things to know:

- **`packages/shared` compiles to `dist/`** and the apps import the compiled output. `pnpm dev` keeps a watcher running. If you change shared code while running an app *standalone*, rebuild it: `pnpm --filter @tradekwik/shared build`.
- **Storefront production builds pre-render pages from live API data** — start the API (and DB) before `pnpm --filter @tradekwik/storefront build`. If the API is down the build still succeeds; pages just render on demand instead.
- Storefront pages are cached with **ISR (5 min)** — after changing data (e.g. publishing a product), a production storefront can take up to 5 minutes to reflect it. `next dev` shows changes immediately.

---

## 4. Database

Dev DB: local PostgreSQL (service `postgresql-x64-15`), database `tradekwik`, port 5432. Connection string lives in `apps/api/.env`.

### Commands

```bash
pnpm --filter @tradekwik/api db:generate   # after editing schema.ts: diff → new migration .sql
pnpm --filter @tradekwik/api db:migrate    # apply pending migrations to DATABASE_URL
pnpm --filter @tradekwik/api db:seed       # WIPES all data, inserts 4 sellers / 16 products / 1 buyer / 2 demo orders / 11 documents / logins
pnpm --filter @tradekwik/api db:studio     # Drizzle Studio — browse & edit rows in the browser
```

### Changing the schema (the loop)

1. Edit [apps/api/src/db/schema.ts](../apps/api/src/db/schema.ts) (enum values live in `packages/shared/src/constants.ts`).
2. `db:generate` — writes a numbered SQL file to `apps/api/src/db/migrations/` (commit it).
3. `db:migrate` — applies it.

Never edit the database by hand (pgAdmin etc.) — schema.ts and reality will drift, and the next generated migration will be wrong.

### Docker alternative (instead of local Postgres)

```bash
docker run -d --name tradekwik-postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tradekwik \
  -p 5433:5432 -v tradekwik-pgdata:/var/lib/postgresql/data postgres:17-alpine
# then: DATABASE_URL=postgresql://postgres:postgres@localhost:5433/tradekwik
```

(A stopped container named `tradekwik-postgres` may already exist from earlier setup: `docker start tradekwik-postgres`.)

---

## 5. Testing & checks

```bash
# monorepo-wide
pnpm typecheck                             # tsc --noEmit across all packages
pnpm lint                                  # oxlint (api); add app linters as needed
pnpm build                                 # the strictest check — full build of everything

# API tests (vitest)
pnpm --filter @tradekwik/api test          # unit tests
pnpm --filter @tradekwik/api test:watch    # watch mode
pnpm --filter @tradekwik/api test:e2e      # e2e tests (needs DATABASE_URL reachable)
pnpm --filter @tradekwik/api test:cov      # with coverage
```

### Testing the API by hand

Easiest: open **Swagger** at http://localhost:4000/api/docs → "Try it out" on any endpoint. For protected endpoints: run `POST /auth/seller/login` (or `/auth/admin/login`), copy the `token` from the response, click **Authorize**, paste it.

Or with curl:

```bash
# public
curl http://localhost:4000/api/v1/categories
curl "http://localhost:4000/api/v1/products?q=machine&page=1"
curl http://localhost:4000/api/v1/sellers/meltz-ice-cream

# login → token
curl -X POST http://localhost:4000/api/v1/auth/seller/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876500001","password":"seller123"}'

# authenticated (replace $TOKEN)
curl http://localhost:4000/api/v1/seller/dashboard -H "Authorization: Bearer $TOKEN"

# create an inquiry (rate-limited: 5/min per IP)
curl -X POST http://localhost:4000/api/v1/inquiries \
  -H "Content-Type: application/json" \
  -d '{"sellerId":"<uuid>","buyerName":"Test Buyer","buyerPhone":"+919812345678","buyerType":"personal","message":"Testing inquiry","source":"product_page"}'

# upload an image (seller JWT required)
curl -X POST http://localhost:4000/api/v1/seller/uploads \
  -H "Authorization: Bearer $TOKEN" -F "file=@photo.jpg"
```

PowerShell equivalent for JSON POSTs:

```powershell
Invoke-RestMethod http://localhost:4000/api/v1/auth/seller/login -Method Post `
  -Body (@{phone='9876500001';password='seller123'} | ConvertTo-Json) -ContentType 'application/json'
```

### End-to-end smoke test (manual, ~3 minutes)

1. `pnpm dev`, open http://localhost:3000 → homepage shows categories/sellers/products.
2. Open a product → submit the inquiry form → success page appears.
3. Log in at http://localhost:3001 as `9876500001`/`seller123` → the inquiry is in **Inquiries** with status `new`; the API terminal shows the `[WhatsApp stub]` notification.
4. Toggle a product's **Published** switch off → it disappears from the storefront (immediately in dev; ≤5 min in prod builds).
5. Log in on the **Admin** tab (`admin@tradekwik.com`/`admin123`) → Overview shows platform stats; suspend a seller → their storefront 404s and their login is blocked.

### Lighthouse (performance/SEO audit)

Run against a **production** build (dev mode scores are meaningless):

```powershell
# terminal 1: API running; terminal 2:
pnpm --filter @tradekwik/storefront build; pnpm --filter @tradekwik/storefront start
# terminal 3 (headless Chrome on a fixed port avoids a Windows temp-cleanup bug):
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --remote-debugging-port=9333 --user-data-dir="$env:TEMP\lh-profile" about:blank
pnpm dlx lighthouse "http://localhost:3000/store/shakti-embroidery-machines/aari-embroidery-machine-single-head" `
  --port=9333 "--only-categories=performance,seo,accessibility,best-practices" --view
```

Baseline on the product page (mobile): **Perf 96 · SEO 100 · A11y 100 · Best Practices 100** — treat drops below that as regressions.

---

## 6. Common workflows

| I want to… | Do |
| --- | --- |
| Reset demo data | `pnpm --filter @tradekwik/api db:seed` |
| Add a dependency to one app | `pnpm --filter @tradekwik/api add <pkg>` (never add app deps at the root) |
| Add a shared type/schema | Edit `packages/shared/src/`, export from `index.ts` — API + frontends both get it |
| Add an API endpoint | Zod schema in shared → controller/service in `apps/api/src/modules/<domain>/` → Swagger decorators |
| Add a storefront page | `apps/storefront/app/<route>/page.tsx` + `generateMetadata`; data via `lib/api.ts` |
| Add an admin page | `apps/admin/app/(panel)/<route>/page.tsx` ("use client"); data via `lib/api.ts` |
| Add a shadcn component | `cd apps/admin && pnpm dlx shadcn@latest add <name>` |
| Onboard a real seller | Admin panel → Sellers → “+ Onboard seller” |
| See what the seller gets notified | Watch the API terminal for `[WhatsApp stub]` / `[Email stub]` log lines |

---

## 7. Environment variables

### apps/api/.env

| Var | Example | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `DATABASE_URL` | `postgresql://postgres:PASS@localhost:5432/tradekwik` | the only secret-bearing var in dev |
| `JWT_SECRET` | long random string | **change in production** |
| `JWT_EXPIRES_IN` | `7d` | |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | comma-separated |
| `STORAGE_DRIVER` | `local` | R2/S3 adapter later |
| `UPLOADS_DIR` | `./uploads` | local dev only |
| `API_PUBLIC_URL` | `http://localhost:4000` | used to build uploaded-image URLs |
| `COOKIE_DOMAIN` | *(empty in dev)* | prod: `.tradekwik.com` so the admin subdomain sees the auth cookie |

### apps/storefront/.env.local

| Var | Example | Notes |
| --- | --- | --- |
| `API_URL` | `http://localhost:4000/api/v1` | server-side fetches |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | canonicals/sitemap/OG |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | browser-side form posts |

### apps/admin/.env.local

| Var | Example |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` |

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `EADDRINUSE` / port already in use | Something holds 3000/3001/4000: `netstat -ano \| findstr :4000` then `taskkill /PID <pid> /F` |
| API: `password authentication failed` | Wrong Postgres password in `apps/api/.env` `DATABASE_URL` |
| API: `relation ... does not exist` | Migrations not applied: `pnpm --filter @tradekwik/api db:migrate` |
| Storefront shows "API: not reachable" / empty homepage | API isn't running, or `API_URL` wrong |
| Types out of date across apps ("property does not exist" on a shared type) | `pnpm --filter @tradekwik/shared build` (or keep `pnpm dev` running) |
| Admin login loops back to /login | API not running, or cookie blocked — in dev both apps must be on `localhost` (not 127.0.0.1 mixed with localhost) |
| 429 `Too many requests` while testing forms | Rate limit (5/min/IP on public POSTs, 10/min on logins) — wait a minute |
| Product/store edits don't show on storefront (prod build) | ISR cache — wait up to 5 min or restart the storefront |
| `pnpm install` blocked: "Ignored build scripts" | Add the package under `allowBuilds:` in `pnpm-workspace.yaml`, re-run `pnpm install` |
| Seed data has stale test sellers | `db:seed` wipes and recreates everything |
| Windows PowerShell mangles UTF-8 when scripting file edits | Don't batch-edit sources with `Get/Set-Content` in PS 5.1 — see git history if it happens |

---

## 9. Deployment checklist (when ready)

1. **Neon**: create project → run `db:migrate` with the Neon `DATABASE_URL` → seed only if you want demo data.
2. **API on Railway/Render**: build `pnpm --filter @tradekwik/api build`, start `node dist/main.js`; set all §7 API vars (`NODE_ENV=production`, real `JWT_SECRET`, prod `CORS_ORIGINS`, `COOKIE_DOMAIN=.tradekwik.com`, `API_PUBLIC_URL=https://api.tradekwik.com`).
3. **Storefront + Admin on Vercel**: root directories `apps/storefront` / `apps/admin`; set their §7 vars to production URLs. Storefront build needs the API reachable to pre-render.
4. Before real users: swap `NotificationsService.sendWhatsApp` stub for Interakt/AiSensy, implement the R2/S3 `StorageService` (local disk doesn't survive redeploys), rotate seeded passwords.
