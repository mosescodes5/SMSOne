# Relay — Next.js

Landing page + dashboard, built with Next.js 16 (App Router) + Tailwind v4.
Premium dark fintech theme (with a working light-mode toggle), built around
the digit-reel signature element.

## Design system

Not the generic dark-SaaS slate-900/blue-600 look — a distinct warm
charcoal-plum base with an indigo→violet signal gradient, mint/amber status
colors. Full token list in `app/globals.css` (`:root` for dark/default,
`.light` for the light-mode override). Every status color (`mint`, `amber`,
`red`, `signal`) has **separate light/dark values** — the dark-theme hues
fail WCAG AA contrast outright on a light background, so they're not just
reused as-is; this was checked with actual contrast-ratio math, not eyeballed.

Motion is via Framer Motion: one orchestrated hero entrance
(`HeroEntrance.jsx`), scroll-triggered section reveals (`Reveal.jsx`), an
ambient gradient-mesh backdrop (`GradientMesh.jsx`), and a count-up stat
component (`AnimatedCounter.jsx`) wired to real listed prices — deliberately
*not* wired to invented growth metrics ("500,000+ numbers sold" etc.), since
publishing fabricated numbers on a site handling real naira payments is a
bad idea, not just a design one. Swap in real numbers once you have them.

## Run it locally

```bash
npm install
cp .env.example .env.local
# edit .env.local if your backend runs somewhere other than localhost:8811
npm run dev
```

Visit `http://localhost:3000` for the landing page, `/dashboard` for the app,
`/terms` for the legal page.

Start the backend separately (see the sms-reseller FastAPI project):
```bash
python -m uvicorn app.main:app --port 8811
```

## Structure

```
app/
  layout.js          Root layout, fonts, ThemeProvider (dark default, light toggle)
  globals.css          Design tokens — dark in :root, light overrides in .light
  page.js                Landing page (hero, how-it-works, pricing, FAQ, contact)
  dashboard/page.js        Client component: auth, wallet, buy/poll flow, ledger
  terms/page.js               Terms / Privacy / Refund / Delivery policy
components/
  DigitReel.jsx        Signature odometer-style code display, glass + mint glow
  HeroDemoReel.jsx       Cycles demo codes for the landing page hero
  GradientMesh.jsx        Ambient hero background (drifting gradient blobs)
  Reveal.jsx                Scroll-triggered fade+slide wrapper for sections
  HeroEntrance.jsx           One-time staggered entrance for hero content
  AnimatedCounter.jsx          Count-up number, wired to real prices only
  ThemeProvider.jsx / ThemeToggle.jsx   next-themes wiring + toggle button
  ui.jsx                    Button, Card, Field, Input, Select, Pill
  SiteHeader.jsx / SiteFooter.jsx
lib/
  api.js              All backend calls — mirrors the FastAPI routes 1:1
```

## Deploying on Vercel

This deploys to Vercel with zero config — `vercel deploy` or connect the repo
in the dashboard. Set the one environment variable in Vercel's project
settings:

```
NEXT_PUBLIC_RELAY_API_BASE=https://your-backend-domain.com
```

**The backend still needs to live somewhere else.** FastAPI doesn't run as a
Vercel serverless function without restructuring (no persistent process, so
the order-expiry background job wouldn't work) — deploy it to Railway,
Render, Fly.io, or similar, then point this env var at it.

## Supabase

Not wired in yet. If you move auth/wallet data to Supabase, the main things
that change are `lib/api.js` (swap the hand-rolled JWT calls for
`@supabase/supabase-js`) and the backend's `app/models.py` / `app/auth.py`.
Ask if you want that migration done — it's a real change to the backend, not
just this frontend.

## What's real vs stubbed

Auth, wallet balance/ledger, price preview, and the full buy → poll → receive
→ auto-refund order flow are all tested end-to-end against the live backend
(most recently re-confirmed after the redesign, to make sure restyling didn't
break the actual functionality). Korapay top-up needs real keys in the
backend's `.env` to return an actual checkout URL; without them it fails
cleanly with a readable error. `app/terms/page.js` still has bracketed
placeholders to fill in before publishing.

## What this pass didn't cover

This was scoped to "make the UI unique and professional," not the full
platform spec (Prisma schema, Supabase RLS, admin panel, payment webhooks,
API docs, support tickets, coupons, referrals, etc.) — those are separate,
substantial pieces of work. Ask if you want to tackle any of them next.

