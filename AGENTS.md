# juno.tokyo Project Notes

This repository manages the static web presence for `juno.tokyo`.

## Current Purpose

- Primary deployed site: `https://juno.tokyo`
- Current public landing page: `https://juno.tokyo/popscan/`
- Root `index.html` is intentionally minimal and redirects visitors to `/popscan/`.
- PopScan is a static landing page. Do not add WordPress or server-side runtime dependencies for the current site.

## Repository

- GitHub repository: `junotokyo/juno.tokyo`
- Local path: `/Users/jokamoto/Library/CloudStorage/Dropbox/Codex/juno.tokyo`
- Default branch: `main`
- Hosting: Netlify
- Netlify project URL: `https://dainty-salmiakki-52b993.netlify.app`

## Directory Layout

```text
.
├── index.html
├── robots.txt
└── popscan/
    ├── index.html
    ├── styles.css
    ├── script.js
    └── assets/
```

## Deployment

Netlify imports the GitHub repository and deploys automatically from `main`.

- Build command: none
- Publish directory: repository root (`.`)
- Update workflow:

```bash
cd /Users/jokamoto/Library/CloudStorage/Dropbox/Codex/juno.tokyo
git add .
git commit -m "Update site"
git push
```

## DNS And Domains

DNS is managed in onamae.com Navi using the `dnsv.jp` nameservers:

- `01.dnsv.jp`
- `02.dnsv.jp`
- `03.dnsv.jp`
- `04.dnsv.jp`

Important web records:

```text
juno.tokyo       A      75.2.60.5
www.juno.tokyo   CNAME  dainty-salmiakki-52b993.netlify.app
```

`www.juno.tokyo` redirects to the primary domain `juno.tokyo` through Netlify.

## Mail

Mail for `code@juno.tokyo` is still handled by onamae.com mail infrastructure and was tested successfully after the Netlify migration.

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

- The PopScan LP was first uploaded manually to onamae.com Rental Server under `public_html/juno.tokyo/popscan`.
- The onamae.com Rental Server control panel and file manager felt too old for ongoing static-site deployment.
- The site was migrated to GitHub + Netlify on 2026-05-01.
- The old `popscan` folder was deleted from the onamae.com Rental Server after Netlify migration.

## Future Direction

- Keep PopScan LP on Netlify for now.
- If a dynamic photo CMS or web app is built later, use a subdomain such as `photos.juno.tokyo`.
- For a heavier Next.js app, Vercel is the likely hosting choice.
- Re-evaluate whether to move PopScan to Vercel or keep Netlify/Vercel split if that future app is created.

## Editing Guidelines

- Keep this site static unless the user explicitly changes direction.
- Preserve `/popscan/` as the public PopScan URL.
- Avoid changing DNS or mail assumptions without confirming current records first.
- Do not commit `.DS_Store`; it is ignored by `.gitignore`.
