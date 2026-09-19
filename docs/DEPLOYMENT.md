# TradeKwik — Production Deployment Guide

Step-by-step instructions to take TradeKwik from your laptop to a live site. Written for a first deployment on a single Linux server, with a cloud-platform alternative in §11.

For day-to-day development see [DEVELOPMENT.md](DEVELOPMENT.md). For what is built and what is planned see [ROADMAP.md](ROADMAP.md).

> **Read §9 before taking real users.** Two things are still stubs: WhatsApp/email notifications and file storage. Deploying without addressing them is fine for a closed pilot, not for a public launch.

---

## 1. What you are deploying

Three processes plus a database:

| Piece | Tech | Port (default) | Public address (suggested) |
| --- | --- | --- | --- |
| API | NestJS (Node) | 4000 | `api.tradekwik.com` |
| Storefront | Next.js — public site, buyer accounts | 3000 | `tradekwik.com` |
| Seller + admin app | Next.js — seller panel, platform admin | 3001 | `seller.tradekwik.com` |
| Database | PostgreSQL 15+ | 5432 | managed, not public |

`packages/shared` is a library compiled into all three; it is not deployed separately.

**Use subdomains of one root domain.** The login cookie is issued by the API with `Domain=.tradekwik.com`. If the storefront and the seller app live on unrelated domains, browsers will not send that cookie and logins will silently fail.

---

## 2. Before you start — decisions and accounts

| Decision | Recommended | Why it matters |
| --- | --- | --- |
| Domain | one root + subdomains | cookie sharing (above) |
| Postgres | Neon, Supabase or RDS | managed backups; avoid self-hosting on day one |
| Server | 1 vCPU / 2 GB VPS is enough to start | all three apps fit comfortably |
| OTP provider | 2Factor.in to start, MSG91 later | 2Factor needs no DLT registration, live same day |
| File storage | persistent disk now, S3/R2 later | see §9 |
| TLS | Let's Encrypt via certbot | free, auto-renews |

Accounts to create in advance: domain registrar, Postgres provider, VPS provider, OTP provider. If you will charge sellers, GST registration too.

---

## 3. Server preparation

```bash
# Ubuntu 22.04 / 24.04
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl

# Node 22 LTS (the repo requires >= 20)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm (the repo pins pnpm 12) and pm2 for process management
sudo corepack enable
sudo corepack prepare pnpm@12.4.2 --activate
sudo npm install -g pm2

node -v && pnpm -v      # expect v22.x and 12.4.2
```

Create a dedicated user and the uploads directory:

```bash
sudo adduser --system --group --home /srv/tradekwik tradekwik
sudo mkdir -p /var/lib/tradekwik/uploads
sudo chown -R tradekwik:tradekwik /var/lib/tradekwik /srv/tradekwik
```

---

## 4. Database

1. Create a Postgres database named `tradekwik` with your provider.
2. Copy the connection string. It must end with `?sslmode=require` for a managed provider.
3. Confirm it works from the server:

```bash
psql "postgresql://USER:PASSWORD@HOST/tradekwik?sslmode=require" -c "select version();"
```

**Do not run `db:seed` against production.** It deletes every row and inserts demo data. It is a development tool only.

---

## 5. Secrets and environment files

Templates live in [`docs/deploy/`](deploy/). Copy each one and replace every `<<CHANGE>>`:

```bash
cd /srv/tradekwik/tradekwik
cp docs/deploy/api.env.example        apps/api/.env
cp docs/deploy/storefront.env.example apps/storefront/.env.production
cp docs/deploy/admin.env.example      apps/admin/.env.production
```

Generate the JWT secret:

```bash
openssl rand -base64 48
```

### Three settings people get wrong

1. **`NEXT_PUBLIC_*` values are baked in at build time.** Both Next apps read them when you run `pnpm build`, not when the process starts. Fill in the two `.env.production` files *before* building; changing one later needs a rebuild, not a restart.
2. **`TRUST_PROXY=1` is required behind nginx.** Without it every request looks like it came from `127.0.0.1`, which breaks the admin IP allow-list and makes the OTP per-IP limit count all users as one.
3. **`COOKIE_DOMAIN` needs the leading dot**, for example `.tradekwik.com`, so the cookie is valid on every subdomain.

Lock the files down:

```bash
chmod 600 apps/api/.env apps/storefront/.env.production apps/admin/.env.production
```

`.env*` is already in `.gitignore`; never commit a filled-in file.

---

## 6. Build and migrate

```bash
sudo -u tradekwik -H bash
cd /srv/tradekwik
git clone <your-repo-url> tradekwik && cd tradekwik
git checkout main

pnpm install --frozen-lockfile
pnpm build            # builds shared → api → both Next apps

# create/upgrade the schema (safe to re-run; never destroys data)
pnpm --filter @tradekwik/api db:migrate
```

If the build fails on `.next/dev/types`, delete `apps/*/.next` and build again. That folder is a dev-server artefact.

---

## 7. First-run bootstrap (production data)

The database is empty after migration. Create your admin access by SQL. Run these against production, replacing the placeholders.

**7.1 — Allow your IP to reach the admin login.** The platform admin page at `seller.tradekwik.com/admin-access` returns a plain 404 to everyone else.

```sql
-- find your address first: curl https://ifconfig.me
insert into admin_allowed_ips (ip, label) values ('203.0.113.42', 'office');
```

**7.2 — Create an access code** (a third factor on top of email and password):

```sql
insert into admin_access_codes (code, label, expires_at)
values ('<<long random string>>', 'launch', now() + interval '90 days');
```

**7.3 — Create your admin user.** Generate a bcrypt hash first:

```bash
# run from apps/api — that is where bcryptjs is installed
cd /srv/tradekwik/tradekwik/apps/api
node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" 'YourStrongPassword'
```

```sql
insert into platform_admins (name, email, password_hash, role)
values ('Your Name', 'you@example.com', '<<hash from above>>', 'super_admin');
```

**7.4 — Create at least one category** so sellers can register:

```sql
insert into categories (name, slug, sort_order) values ('Embroidery Machines','embroidery-machines',1);
```

After logging in you can manage categories, sellers and plans from the UI.

---

## 8. Run the processes

Create `/srv/tradekwik/ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    { name: 'tk-api',        cwd: '/srv/tradekwik/tradekwik/apps/api',        script: 'dist/main.js', env: { NODE_ENV: 'production' } },
    { name: 'tk-storefront', cwd: '/srv/tradekwik/tradekwik/apps/storefront', script: 'node_modules/next/dist/bin/next', args: 'start --port 3000', env: { NODE_ENV: 'production' } },
    { name: 'tk-admin',      cwd: '/srv/tradekwik/tradekwik/apps/admin',      script: 'node_modules/next/dist/bin/next', args: 'start --port 3001', env: { NODE_ENV: 'production' } },
  ],
};
```

```bash
pm2 start /srv/tradekwik/ecosystem.config.cjs
pm2 save
pm2 startup        # run the command it prints, as root, so PM2 survives reboot
pm2 logs           # watch for startup errors
```

### nginx

`/etc/nginx/sites-available/tradekwik`:

```nginx
# --- API ---
server {
  listen 80;
  server_name api.tradekwik.com;
  client_max_body_size 12M;          # document uploads are capped at 10 MB
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# --- Storefront ---
server {
  listen 80;
  server_name tradekwik.com www.tradekwik.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# --- Seller + admin ---
server {
  listen 80;
  server_name seller.tradekwik.com;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

The `X-Forwarded-For` header is what `TRUST_PROXY=1` reads. Without both, IP restrictions do not work.

```bash
sudo ln -s /etc/nginx/sites-available/tradekwik /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS for all three names at once
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tradekwik.com -d www.tradekwik.com -d api.tradekwik.com -d seller.tradekwik.com
```

Certbot rewrites the config for HTTPS and sets up renewal. Point your DNS A records at the server before running it.

---

## 9. Before real users — two open items

**Notifications are stubs.** `NotificationsService` logs WhatsApp messages and sends email through a logging transport. Nobody is told about a new inquiry, an order update, a bilty number or an approval. Until a provider is wired in, you must send these by hand. All of it is in one file, `apps/api/src/modules/notifications/notifications.service.ts`; only the two method bodies change.

**Uploads are on local disk.** Product images, bilty photos and compliance documents are written to `UPLOADS_DIR` and served from `/uploads/`. This works on a VPS with a persistent disk, which is why `UPLOADS_DIR` points at `/var/lib/tradekwik/uploads` and not inside the repo. It does **not** work on Vercel, Heroku-style dynos or any container that is rebuilt on deploy — files vanish and every GST certificate is lost. The fix is an S3 or Cloudflare R2 adapter implementing the existing `StorageService` interface; nothing else changes. Back the directory up until then.

Also decide before launch: real values for `NEXT_PUBLIC_LEGAL_ENTITY` and `NEXT_PUBLIC_LEGAL_ADDRESS`, since the Terms and Privacy pages name them, and a lawyer's review of those two pages.

---

## 10. Post-deploy checklist

Run through this the first time and after every deploy.

```bash
curl -s https://api.tradekwik.com/api/v1/health            # {"data":{"status":"ok",...}}
curl -s -o /dev/null -w '%{http_code}\n' https://tradekwik.com
curl -s -o /dev/null -w '%{http_code}\n' https://seller.tradekwik.com/login
curl -s -o /dev/null -w '%{http_code}\n' https://api.tradekwik.com/api/docs   # expect 404
```

| Check | Expected |
| --- | --- |
| Storefront homepage, categories, a store page | load over HTTPS |
| `seller.tradekwik.com/admin-access` from an allowed IP | login form |
| Same page from a phone on mobile data | plain 404 |
| Admin login with email + password + access code | reaches the overview |
| Seller registration, OTP arrives by SMS | real message, not a code on screen |
| Buyer registration and login | session survives a refresh |
| Upload a product image | visible after a PM2 restart |
| `/api/docs` | 404 unless you set `ENABLE_SWAGGER=1` |

If a `devCode` appears in the OTP response, `NODE_ENV` is not `production`. Fix that before opening sign-ups.

---

## 11. Alternative: managed platforms

If you would rather not run a server:

| Piece | Service | Notes |
| --- | --- | --- |
| Storefront + seller app | Vercel | two projects from the same repo, root directories `apps/storefront` and `apps/admin`; set env vars in the dashboard **before** the first build |
| API | Render, Railway or Fly.io | build `pnpm install && pnpm build`, start `node dist/main.js`; attach a persistent volume for uploads or move to S3 first |
| Database | Neon | free tier is enough to start |

The same environment variables apply. Vercel builds with the dashboard variables, so `NEXT_PUBLIC_*` must be set there, not in a file.

---

## 12. Updates, backups, rollback

**Deploy an update:**

```bash
cd /srv/tradekwik/tradekwik
git pull
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @tradekwik/api db:migrate      # only if migrations changed
pm2 restart all
```

Migrations are additive and safe to re-run. Review any new `.sql` file in `apps/api/src/db/migrations/` before applying it to production.

**Back up before every deploy:**

```bash
pg_dump "$DATABASE_URL" --no-owner --format=custom -f ~/backup-$(date +%F-%H%M).dump
tar czf ~/uploads-$(date +%F).tar.gz -C /var/lib/tradekwik uploads
```

Automate both daily with cron and keep copies off the server. Managed Postgres gives you point-in-time restore; uploads are your responsibility.

**Rollback:**

```bash
git checkout <previous-commit>
pnpm install --frozen-lockfile && pnpm build && pm2 restart all
```

Rolling *back* a migration is not automatic. If a release includes a destructive migration, take a dump first and be ready to restore.

---

## 13. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Logged in on the storefront but not the seller app | `COOKIE_DOMAIN` missing or lacks the leading dot; the apps are on unrelated domains |
| Browser console shows a CORS error | the exact origin, including `https://` and any `www.`, is not in `CORS_ORIGINS` |
| Admin page 404s from your own office | your public IP changed, or `TRUST_PROXY=1` / `X-Forwarded-For` is missing |
| Everyone shares one OTP quota | same cause: the API sees only the proxy IP |
| OTP response contains `devCode` | `NODE_ENV` is not `production` |
| Uploaded images 404 after a deploy | `UPLOADS_DIR` is not on a persistent disk (§9) |
| Changed a `NEXT_PUBLIC_*` value, nothing happened | rebuild the Next app; those values are compiled in |
| `relation ... does not exist` | migrations not applied: `pnpm --filter @tradekwik/api db:migrate` |
| Build fails in `.next/dev/types/validator.ts` | stale dev artefact: `rm -rf apps/*/.next` and rebuild |
| Seller cannot edit anything | trial or plan has lapsed; activate a plan from super admin → Sellers → Plan |
