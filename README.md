# ParamisTech / پارامیس‌تک

Persian (RTL) website for a software studio: Next.js 16 (App Router) + PostgreSQL (Drizzle) with an admin CMS.
Public content (services, projects, posts, FAQs, contact settings) lives in the database; UI labels stay in `src/content`.

## Local development

1. Node.js 22, PostgreSQL 16, npm. Run `npm ci`.
2. `cp .env.example .env` and set at least `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`),
   `RATE_LIMIT_SALT` (16+ random chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (14+ chars).
3. `npm run db:migrate` (applies the committed SQL files in `drizzle/`; never use `drizzle-kit push` outside a throwaway DB).
4. `node scripts/seed-admin.mjs` creates the first admin. Optional demo data: `node scripts/seed-content.mjs`.
5. `npm run dev`, admin at `/admin`.

After changing `src/db/schema.ts`: `npm run db:generate`, review and commit the new SQL file.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (compose sets it for you). |
| `NEXT_PUBLIC_SITE_URL` | yes | Public https URL. Used for canonical URLs, sitemap and as the only allowed `Origin` for admin mutations. Baked in at build time. |
| `POSTGRES_PASSWORD` | compose | Password of the bundled Postgres. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed | Used only by `seed-admin.mjs` (re-running resets that admin's password and signs it out everywhere). |
| `RATE_LIMIT_SALT` | production | 16+ chars; salts the hashed IP / email used for rate limits. The app refuses to hash without it in production. |
| `TRUST_PROXY` | no | `true` only when a trusted proxy overwrites `X-Forwarded-For` (the Caddy stack sets it). With `false`, all visitors share one rate-limit bucket, so use it for local runs only. |
| `SITE_DOMAIN`, `ACME_EMAIL` | compose | Domain and Let's Encrypt contact for Caddy. |
| `ALLOW_PLACEHOLDERS` | no | `true` shows sample rows (`is_placeholder`) in production. Leave unset for a real launch. |
| `UPLOADS_DIR` | no | Where optimized uploads are stored (`/data/uploads` volume in Docker). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `NOTIFY_EMAILS` | no | Email notification for new leads. Needs `SMTP_HOST`, `SMTP_FROM`, `NOTIFY_EMAILS`. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | no | Telegram pointer message (name, project type, admin link; never the free-text details). |
| `ANALYTICS_SCRIPT_URL`, `ANALYTICS_SITE_ID` | no | Optional analytics script (https). Loads nothing if either is missing. |

`SESSION_SECRET` no longer exists: sessions are random tokens stored hashed in the database.

## Deploy on a fresh server (Docker + Caddy, automatic HTTPS)

Point your domain's DNS at the server, open ports 80/443, then:

```sh
cp .env.example .env     # set NEXT_PUBLIC_SITE_URL=https://your-domain, SITE_DOMAIN, ACME_EMAIL,
                         # POSTGRES_PASSWORD, RATE_LIMIT_SALT, ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_* ...
docker compose up -d --build
docker compose exec app node scripts/seed-admin.mjs
```

What happens: `db` starts, the one-shot `migrate` service applies migrations and exits, `app` starts (non-root, health-checked on `/api/health`, which verifies the database), and `caddy` is the only service publishing ports. Caddy overwrites `X-Forwarded-For`, which is why `docker-compose.yml` sets `TRUST_PROXY=true` for this stack only. Do not run `seed-content.mjs` in production; it only adds sample rows that stay hidden anyway.

### Local Docker without Caddy

```sh
# .env: NEXT_PUBLIC_SITE_URL=http://localhost:3000
docker compose -f docker-compose.yml -f docker-compose.override.example.yml up -d --build
docker compose exec app node scripts/seed-admin.mjs
```

The override publishes port 3000, sets `TRUST_PROXY=false` and keeps Caddy off (`--profile proxy` starts it).

> The compose files and Caddyfile were written and syntax-checked but not run in the authoring sandbox (no Docker there). Run the steps above once on a staging machine before relying on them.

## Roles

| Capability | admin | editor |
| --- | :-: | :-: |
| Services, projects, posts, FAQs, media | yes | yes |
| Read leads, change status/notes | yes | yes |
| Delete leads, export CSV | yes | no |
| Settings (contact info, socials) | yes | no |
| Users, activity log | yes | no |
| Change own password, sign out everywhere | yes | yes |

Every server action, route handler and page re-checks the session and role on the server; hidden links are only cosmetic.
The login form and the logout button are plain HTML forms that post to `/api/admin/login` and `/api/admin/logout`
(303 back to `/admin`, errors come back as `?error=invalid|limited`), so signing in and out also works with
JavaScript disabled or blocked; the JSON responses those routes return stay in place for the enhanced path, which
navigates with `window.location.assign` rather than a client-side RSC refresh. Sessions last 8 hours of inactivity (sliding) and at most 7 days; deactivating a user or resetting their password revokes their sessions immediately. Logins are rate limited per IP and per email with a 15 minute lockout.

## Backups and restore

Host install: `DATABASE_URL=... UPLOADS_DIR=... sh scripts/backup.sh` writes `pg_dump` + an uploads archive and prunes files older than `BACKUP_RETENTION_DAYS` (default 14).

Docker:

```sh
mkdir -p backups
docker compose exec -T db pg_dump -U postgres paramistech | gzip > backups/db-$(date +%F).sql.gz
docker run --rm -v "$(basename "$PWD")_uploads:/data:ro" -v "$PWD/backups:/backup" alpine \
  tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

Restore into an empty database (stop the app first, then test on a separate instance before trusting it):

```sh
docker compose stop app
docker compose exec -T db psql -U postgres -c 'DROP DATABASE paramistech' -c 'CREATE DATABASE paramistech'
gunzip -c backups/db-DATE.sql.gz | docker compose exec -T db psql -U postgres -d paramistech
docker run --rm -v "$(basename "$PWD")_uploads:/data" -v "$PWD/backups:/backup" alpine \
  sh -c 'cd /data && tar xzf /backup/uploads-DATE.tgz && chown -R 1001:1001 /data'
docker compose up -d app
```

## Quality checks

```sh
npm run lint && npm run typecheck && npm test && npm run build
```

### Browser-free end-to-end suite

`npm run test:http` (`e2e/http-checks.mjs`) covers the same ground as the Playwright scripts over plain HTTP,
so it also runs on machines that cannot download Chromium. It needs a migrated database, a running
production build and the same `PLAYWRIGHT_BASE_URL`/env as the other e2e scripts:

```sh
set -a; . ./.env; set +a
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:http
```

It checks both locales, canonical/hreflang/JSON-LD/robots/sitemap/feeds, CSP nonces and cache headers,
the brand assets and dynamic OG cards, the lead API (validation, honeypot, per-IP rate limit), admin
auth (origin checks, lockout, cookie flags), RBAC and session revocation, CSV export, media uploads
including the size/type rejections, and every CMS write path submitted **without JavaScript** (multipart
POST with the rendered form's hidden `$ACTION_ID` field). It writes a few rows and removes them again,
so point it at a scratch database.

Because a JavaScript-disabled form post is forwarded like a proxied request, the harness sends
`Origin`, `Host` and `X-Forwarded-Host` for `NEXT_PUBLIC_SITE_URL` — exactly what Caddy or a preview
proxy does. Submitting those forms by hand against `127.0.0.1` without the forwarded host makes Next
reject the action ("Invalid Server Actions request"), which is the built-in CSRF guard working as intended.

### Assets and fonts

`public/` (icons, `og.png`, `og-en.png`) and the two Vazirmatn TTFs in `src/assets/fonts` are committed,
because metadata, the dynamic OG routes, the unit tests and the Docker trace all reference them.
`node scripts/generate-assets.mjs` regenerates them from `src/app/icon.svg`, but it needs Chromium
(`npx playwright install chromium`). When that download is unavailable, the OG cards can be composited
with the same sharp/Pango pipeline the app uses at runtime (`src/lib/og-card.ts`) and the Vazirmatn TTFs,
which also ship in the `vazirmatn` npm package (`fonts/ttf/Vazirmatn-{ExtraBold,SemiBold}.ttf`).

End-to-end scripts need a running production build. `scripts/start-standalone.sh` runs the standalone output exactly like the container (own directory, migrations first):

```sh
set -a; . ./.env; set +a
npm run build && PORT=3100 sh scripts/start-standalone.sh &     # NEXT_PUBLIC_SITE_URL must be http://127.0.0.1:3100
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node e2e/smoke.mjs        # lead -> admin, roles, session revocation, editor publishes a post
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node e2e/seo-check.mjs    # titles, canonicals, breadcrumbs, CSP nonce, OG images
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node e2e/prod-checks.mjs  # assets, headers, denial, placeholders, lockout
node e2e/og-shaping-check.mjs                                       # Persian letter joining in OG cards vs Chromium
```

`e2e/notify.mjs` plus `scripts/smtp-sink.mjs` verify the email path against a local SMTP catcher. The smoke test refuses non-local hosts.
`node scripts/generate-assets.mjs` regenerates every icon and `og.png` from `src/app/icon.svg` (needs `npx playwright install chromium`).

## Implementation notes

- **Standalone output**: `next.config.ts` excludes `.env*`, tests, scripts and docs from the trace. Next still copies a local `.env` into `.next/standalone` during `next build`; the Docker build deletes it and `.dockerignore` keeps it out of the context. Do not copy `.next/standalone` to another machine as-is if it was built next to a real `.env`.

- **CSP**: a per-request nonce is generated in `src/proxy.ts`; scripts need no `'unsafe-inline'`. Styles keep `'unsafe-inline'` because React style props and framer-motion emit inline `style` attributes.
- **OG images**: rendered with sharp (Pango/HarfBuzz) and the bundled Vazirmatn TTFs (`src/assets/fonts`, SIL OFL). Next's standalone trace drops libvips' shared library, so `next.config.ts` includes it explicitly; without that, sharp falls back to WASM and cannot render text.
- **Cached content**: `unstable_cache` returns timestamps as strings, so `src/lib/content.ts` revives them to `Date`. The cache also lands on disk (`.next/cache/fetch-cache`), so it survives a restart: after editing rows with raw SQL, call the admin UI (or clear `.next/cache`) — admin writes invalidate the tags themselves.
- **No `tsx` at runtime**: seeds and migrations are plain `.mjs` files that only need `pg` and `bcryptjs`, which are kept external so they are present in the standalone image.
- **Relative paths in a standalone copy**: `scripts/start-standalone.sh` (and the Docker image) run the app from another directory, so a relative `UPLOADS_DIR=./data/uploads` points inside that copy, not next to your `.env`. Set an absolute path (or copy `data/` along) if a second process must see the same uploads.
- Cover uploads travel through server actions, so `serverActions.bodySizeLimit` is `6mb` (the default 1 MB would reject valid 5 MB images).

See `CONTENT-HANDOVER.md` (what is still a placeholder) and `ADMIN-GUIDE.md` (Persian guide for staff).
