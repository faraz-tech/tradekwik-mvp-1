# TradeKwik

Multi-vendor B2B + B2C commerce platform for Indian small/medium businesses. Sellers get a public storefront and a private admin panel; buyers discover products and send inquiries/order requests (no cart/checkout in v1).

## Monorepo layout

| App | Stack | Port | Purpose |
| --- | --- | --- | --- |
| `apps/api` | NestJS 12 (ESM, TypeScript) | 4000 | The only app that touches the database. REST API at `/api/v1`, Swagger at `/api/docs`. |
| `apps/storefront` | Next.js 16 (App Router) | 3000 | Public, SEO-first storefront. Fetches from the API with ISR. |
| `apps/admin` | Next.js 16 (App Router) | 3001 | Seller + super-admin dashboard. Calls the API with JWT. |
| `packages/shared` | TypeScript + Zod 4 | — | Shared DTO types and Zod schemas — the only code shared between apps. |

Tooling: Turborepo 2 + pnpm workspaces. Database: PostgreSQL via Drizzle ORM (schema lives in `apps/api/src/db`).

## Prerequisites

- Node.js >= 22 (built against 24 LTS)
- pnpm >= 10 (`npm install -g pnpm`)
- PostgreSQL 15+ (local, Docker, or Neon) — needed from Phase 2 onward

## Setup

```bash
pnpm install

# copy env files and edit as needed
cp apps/api/.env.example apps/api/.env
cp apps/storefront/.env.example apps/storefront/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

## Database (dev)

Dev uses the locally installed PostgreSQL (service `postgresql-x64-15`, port 5432, database `tradekwik`). Set your password in `apps/api/.env` (`DATABASE_URL`).

Alternative — Docker container instead of a local install:

```bash
docker run -d --name tradekwik-postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tradekwik \
  -p 5433:5432 -v tradekwik-pgdata:/var/lib/postgresql/data postgres:17-alpine
# then use port 5433 in DATABASE_URL
```

Schema lives in `apps/api/src/db/schema.ts`; migrations in `apps/api/src/db/migrations/`.

```bash
pnpm --filter @tradekwik/api db:generate   # generate a migration after changing schema.ts
pnpm --filter @tradekwik/api db:migrate    # apply migrations
pnpm --filter @tradekwik/api db:seed       # wipe + insert launch data (3 sellers, 12 products)
pnpm --filter @tradekwik/api db:studio     # browse data in Drizzle Studio
```

Verify: `GET http://localhost:4000/api/v1/health/db` returns row counts.

Seeded logins (dev only): sellers `+919876500001..3` / `seller123`; admin `admin@tradekwik.com` / `admin123`.

## Run (dev)

```bash
# everything at once (turbo)
pnpm dev

# or individually
pnpm --filter @tradekwik/api dev          # http://localhost:4000/api/v1/health
pnpm --filter @tradekwik/storefront dev   # http://localhost:3000
pnpm --filter @tradekwik/admin dev        # http://localhost:3001
```

Note: `packages/shared` builds to `dist/`. Turbo builds it automatically before dependents; if you run an app directly after changing shared code, run `pnpm --filter @tradekwik/shared build` first (or keep `pnpm dev` running — it watches).

Note: `pnpm --filter @tradekwik/storefront build` pre-renders store/product pages from live API data — start the API (and database) first. If the API is down, the build still succeeds but skips pre-rendering (pages render on demand).

## Build / checks

```bash
pnpm build       # build all apps
pnpm typecheck   # typecheck all apps
pnpm lint
```

## Deployment targets

- API → Railway/Render (long-running Node server)
- Storefront + Admin → Vercel
- Database → Neon Postgres

Everything is env-driven — see `.env.example` in each app.
