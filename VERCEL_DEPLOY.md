# Deploying both frontend and backend on Vercel (one project)

Uses Vercel's **Services** feature — lets a Next.js frontend and a Python
backend live in the same Vercel project, same domain, one deploy. This is
recent enough (rolled out mid-2026) that I've built this from Vercel's
current official docs but could not run an actual `vercel deploy` to confirm
it end-to-end in this sandbox — I don't have Vercel CLI/account access here.
Treat this as "should work per Vercel's documented behavior," and run
`vercel dev` locally first to sanity-check before pushing to production.

## Required folder layout

Both projects need to sit as sibling folders in **one repo**, with
`vercel.json` at the repo root:

```
your-repo/
├── vercel.json          <- new, provided here
├── relay-site/            <- your existing Next.js project, unchanged location
│   └── ...
└── sms-reseller/            <- your existing FastAPI project, unchanged location
    └── ...
```

If your two projects are currently separate Git repos, combine them into one
(move both folders into a new parent repo, or add one as a git submodule —
either works, Vercel just needs to see both folders when it clones).

## What `vercel.json` does

```json
{
  "services": {
    "frontend": { "root": "relay-site/" },
    "backend": {
      "root": "sms-reseller/",
      "entrypoint": "app.main:app",
      "routePrefix": "/backend"
    }
  },
  "rewrites": [
    { "source": "/backend/(.*)", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

- `entrypoint: "app.main:app"` points at the `app` FastAPI instance in
  `sms-reseller/app/main.py` — already correct, no backend code changes needed.
- `routePrefix: "/backend"` is what lets the FastAPI routes stay exactly as
  they are (`/wallet/balance`, `/orders`, etc., no manual `/backend` prefix
  needed in the route definitions) — Vercel mounts the service at that path.
- The two `rewrites` are what actually make each service publicly reachable;
  without them, neither receives traffic (services are internal by default).

## Environment variables

Set these once in **Vercel's Project Settings → Environment Variables** — one
project, one place, even though they're used by two different services:

**Backend needs:**
- `DATABASE_URL` — Supabase's **pooled** connection string (port 6543,
  "Transaction" mode), not the direct one. See the comment in
  `sms-reseller/.env.example` for why this matters specifically for serverless.
- `SUPABASE_JWT_SECRET`
- `PROVIDER`, `PROVIDER_API_KEY` (once you're past the mock provider)
- `KORAPAY_SECRET_KEY`, `KORAPAY_PUBLIC_KEY`, `KORAPAY_REDIRECT_URL`

**Frontend needs:**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_RELAY_API_BASE=/backend` — the relative path, **not** a full
  URL, since frontend and backend now share one domain. This also means CORS
  is no longer relevant in production (same-origin request) — the backend's
  existing permissive CORS middleware is harmless to leave in place, just
  unused for this path.

## Local testing before you deploy

```bash
npm i -g vercel   # if you don't have it
vercel dev
```

This runs both services together locally, matching how they'll actually
route in production — closer to reality than running `uvicorn` and
`npm run dev` separately in two terminals (which still works fine for pure
day-to-day development, just doesn't exercise the `/backend` routing).

## Before this handles real traffic

- Run `supabase_schema.sql` in your Supabase project (if you haven't yet).
- Confirm the pooled `DATABASE_URL` — this is the detail most likely to bite
  you silently (direct connections working fine in low-traffic testing, then
  exhausting the connection limit once real concurrent users show up).
- Swap `PROVIDER=mock` for a real upstream (5SIM, etc.) and add real Korapay
  keys — both still return clean, readable errors instead of crashing if
  left unconfigured, but nothing will actually work end-to-end until they're set.
