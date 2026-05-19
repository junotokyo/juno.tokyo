# juno.tokyo Project Notes

This repository manages the web presence for `juno.tokyo`.

## Current Purpose

- Primary deployed site: `https://juno.tokyo`
- Current public landing page: `https://juno.tokyo/popscan/`
- Root `index.html` is intentionally minimal and redirects visitors to `/popscan/`.
- The public site is static HTML/CSS/JS. PopScan's backend is a small set of
  **Vercel Serverless Functions** under `api/` (promo flag, analytics, promo-code
  redeem, admin stats / error log) backed by **Upstash Redis (KV)**. Do not add
  WordPress or a stateful long-running server; new backend needs go through
  Vercel Functions + KV.

## Repository

- GitHub repository: `junotokyo/juno.tokyo`
- Local path (canonical): `/Users/jokamoto/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo`
- Local path (Codex view, symlink alias): `/Users/jokamoto/Library/CloudStorage/Dropbox/Codex/juno.tokyo`
  — symlink to the canonical path above; editing either reflects the same files.
- Default branch: `main`
- Hosting: **Vercel** (migrated from Netlify on 2026-05-11)
- Vercel project: `juno-tokyo` (`.vercel/project.json` holds the project/org IDs)

## Directory Layout

```text
.
├── index.html
├── robots.txt
├── middleware.js          # Basic-auth gate for /popscan/admin/* and admin APIs
├── vercel.json            # /popscan/* → /api/popscan-* rewrites, headers
├── api/                   # Vercel Serverless Functions
│   ├── popscan-time.js
│   ├── popscan-analytics.js
│   ├── popscan-set-promo.js
│   ├── popscan-redeem-promo.js
│   ├── popscan-manage-promos.js
│   ├── popscan-admin-stats.js
│   ├── popscan-admin-error-log.js
│   └── _lib/              # kv.js / date.js / admin-aggregate.js
├── scripts/               # build/asset helper scripts (e.g. App Store assets)
└── popscan/
    ├── index.html
    ├── styles.css
    ├── script.js
    ├── assets/
    └── admin/             # promo / stats admin UI (Basic-auth, noindex)
```

## Deployment

Vercel imports the GitHub repository and deploys automatically on push to `main`.

- Framework preset: none (static + Vercel Functions in `api/`)
- Build command: none
- Output: repository root served statically; `api/*.js` run as Serverless Functions
- Routing: `vercel.json` rewrites `/popscan/<name>` → `/api/popscan-<name>`
- Update workflow:

```bash
cd /Users/jokamoto/Library/CloudStorage/Dropbox/Projects/Web/juno.tokyo
git add .
git commit -m "Update site"
git push            # → Vercel auto-deploys main
```

### KV / environment variables (Vercel dashboard)

- `KV_REST_API_URL` / `KV_REST_API_TOKEN` / `KV_REST_API_READ_ONLY_TOKEN`
  — auto-injected by the Upstash for Redis Marketplace integration.
- `ADMIN_BASIC_PASS` — Basic-auth password (user is fixed as `admin`) for
  `/popscan/admin/*` and the admin APIs (`set-promo`, `manage-promos`,
  `admin-stats`, `admin-error-log`), enforced by `middleware.js`.

The authoritative spec for the PopScan backend contract (endpoints, KV keys,
error-code allow-list, smoke tests) lives in the PopScan repo:
`SPEC.md` → "Vercel Functions + KV（promo制御）".

## DNS And Domains

DNS is managed in onamae.com Navi using the `dnsv.jp` nameservers (unchanged
through the Netlify→Vercel migration):

- `01.dnsv.jp` / `02.dnsv.jp` / `03.dnsv.jp` / `04.dnsv.jp`

Important web records (verified live 2026-05-19, now pointing at Vercel):

```text
juno.tokyo       A      216.198.79.1
www.juno.tokyo   CNAME  637499c2ab6665de.vercel-dns-017.com
```

`www.juno.tokyo` redirects to the primary domain `juno.tokyo` (configured in
Vercel). If you need to re-verify, use `dig +short juno.tokyo A` and
`dig +short www.juno.tokyo CNAME` rather than trusting cached values here.

## Mail

Mail for `code@juno.tokyo` is handled by onamae.com mail infrastructure and is
independent of web hosting (unaffected by the Netlify→Vercel migration).

Important mail-related records:

```text
juno.tokyo                  MX   mail89.onamae.ne.jp priority 10
juno.tokyo                  TXT  v=spf1 include:_spf.onamae.ne.jp ~all
mail.juno.tokyo             A    160.251.71.112
ml-cp.juno.tokyo            A    160.251.71.112
_dmarc.juno.tokyo           TXT  v=DMARC1; p=reject
default._domainkey.juno.tokyo TXT DKIM record from onamae.com mail
```

Be careful not to remove mail DNS records when changing hosting.

## Historical Context

- The PopScan LP was first uploaded manually to onamae.com Rental Server under
  `public_html/juno.tokyo/popscan`.
- The onamae.com Rental Server control panel and file manager felt too old for
  ongoing static-site deployment.
- The site was migrated to GitHub + Netlify on 2026-05-01; the old `popscan`
  folder was deleted from the onamae.com Rental Server afterward.
- **Migrated from Netlify to Vercel on 2026-05-11** (to add Serverless Functions
  + Upstash Redis KV for the PopScan promo/analytics/admin backend on the same
  domain). DNS A/CNAME repointed to Vercel; mail DNS left on onamae.com.
- A leftover top-level `netlify/` directory may still exist locally (only a
  stray `.DS_Store`); it is an orphan from the Netlify era and is not used.

## Future Direction

- The site is now on Vercel; static pages + lightweight Vercel Functions.
- If a dynamic photo CMS or web app is built later, use a subdomain such as
  `photos.juno.tokyo` (a heavier Next.js app can live as its own Vercel project).
- Keep the public LP static; route any new backend through Vercel Functions + KV.

## Editing Guidelines

- Keep the public site static unless the user explicitly changes direction;
  backend logic belongs in `api/` Vercel Functions, not inline server runtimes.
- Preserve `/popscan/` as the public PopScan URL.
- Avoid changing DNS or mail assumptions without confirming current records
  first (`dig`), especially mail records.
- Do not commit `.DS_Store`; it is ignored by `.gitignore`.

## Analytics (Vercel Web Analytics)

Vercel Web Analytics is enabled on the `juno-tokyo` Vercel project. Tracking is
opt-in per HTML page via a script tag:

```html
<script defer src="/_vercel/insights/script.js"></script>
```

- Add this tag to the `<head>` of any **public** page you want to count.
- Do **not** add it to admin / internal pages (e.g. `/popscan/admin/`,
  `/popscan/admin/stats/`) — they are `noindex` and tracking them would pollute
  LP metrics.
- For static multi-page sites (current pattern), the script tag is sufficient —
  full-page navigations are recorded by Vercel's CDN-served script.
- For a future SPA or framework app (React / Next / Vue with client-side
  routing) added under the same Vercel project, switch *that* app to the
  `@vercel/analytics` npm package + framework component (`<Analytics/>`) so
  client-side route changes are also counted. Mixing the two approaches in one
  Vercel project is supported; events land in the same dashboard.
- Hobby tier free quota: 2,500 events / month. Watch the dashboard if traffic
  grows.
