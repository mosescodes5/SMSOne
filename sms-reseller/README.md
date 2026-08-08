# SMS Reseller API

Wallet-based reseller backend: buy numbers wholesale from an upstream SMS
provider, mark them up, sell to your own users in NGN. Payments via Korapay.

## Architecture

```
app/
  main.py            FastAPI app, router registration
  config.py           Settings, loaded from .env
  database.py          SQLite/Postgres engine + session
  models.py             User, Order, LedgerEntry, PendingPayment (DB tables)
  schemas.py             Read-only response shapes (API contract, decoupled from DB)
  pricing.py               Markup logic: provider cost (USD) -> customer price (NGN)
  auth.py                    JWT auth helpers
  providers/
    base.py                    Abstract provider interface
    mock.py                     Fake provider for local dev (no real money/API needed)
    fivesim.py                   Real 5sim.net adapter skeleton
    __init__.py                   Factory: picks adapter from PROVIDER env var
  payments/
    korapay.py                    Korapay client: initialize charge, verify, webhook sig
  routers/
    auth.py    /auth/register, /auth/login
    wallet.py   /wallet/balance, /wallet/ledger, /wallet/topup/dev-only (testing only)
    orders.py    /orders/price, /orders (buy), /orders/{id} (poll), /orders/{id}/cancel
    payments.py   /payments/korapay/initialize, /payments/korapay/webhook
```

## Setup

```bash
pip install -r requirements.txt --break-system-packages
cp .env.example .env
# edit .env: set PROVIDER=mock to start (no API key needed), fill in Korapay keys
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for interactive API docs.

## Wiring up a real SMS provider

Set `PROVIDER=fivesim` in `.env` and add your `PROVIDER_API_KEY`. To add
SMS-Activate or SMS-Man instead, write a new adapter in `app/providers/`
implementing the four methods in `base.py`, then register it in
`providers/__init__.py`. Keep `orders.py` untouched — it only talks to the
abstract interface.

## Wiring up Korapay (real payments)

1. Get your keys: Korapay dashboard -> Settings -> API Keys. Use `pk_test_...`
   / `sk_test_...` while testing.
2. Set `KORAPAY_PUBLIC_KEY`, `KORAPAY_SECRET_KEY`, `KORAPAY_REDIRECT_URL` in `.env`.
3. In the Korapay dashboard, set your webhook URL to
   `https://yourdomain.com/payments/korapay/webhook`. This must be a real
   public HTTPS URL — Korapay can't reach `localhost`, so use ngrok or similar
   while developing locally.
4. Frontend flow:
   - `POST /payments/korapay/initialize?amount_ngn=5000` (authenticated) ->
     returns `{reference, checkout_url}`.
   - Redirect the user to `checkout_url`.
   - Korapay redirects back to `KORAPAY_REDIRECT_URL` after payment.
   - Your frontend can poll `GET /payments/korapay/status/{reference}` in case
     the webhook hasn't landed yet by the time the user is redirected back.
5. The wallet is credited **only** by the webhook handler, and only after
   re-verifying the transaction server-side via Korapay's API — the webhook
   payload itself is never trusted for the amount/status. This is what stops
   someone from forging a "payment successful" POST to mint free balance.

Delete or hard-gate `/wallet/topup/dev-only` behind a debug flag before
deploying — right now any authenticated user can call it to credit themselves
for free, which is only safe for local testing.

## Pricing / markup

All markup logic lives in `pricing.py`:
`price_ngn = round_up(max((cost_usd * FX_RATE) * (1 + MARKUP_PERCENT/100) + MARKUP_FLAT_NGN, MIN_PRICE_NGN), nearest=10)`

Tune `MARKUP_PERCENT`, `MARKUP_FLAT_NGN`, `MIN_PRICE_NGN`, and `USD_NGN_RATE`
in `.env`. In production, replace the static `USD_NGN_RATE` with a live rate
fetched and cached hourly — the naira moving against your locked-in rate is
the most common way resellers in this space quietly lose margin.

## What's intentionally left out (production TODOs)

- **Live FX rate fetch** — currently a static env var.
- **Rate limiting** on auth/order endpoints — add `slowapi` or a reverse-proxy layer.
- **Background job for order expiry** — right now orders only refund when the
  user *polls* `/orders/{id}` after expiry. For orders nobody polls again,
  add a periodic sweep (Celery/APScheduler) that expires + refunds stale rows.
- **Postgres in production** — SQLite is fine for dev, switch `DATABASE_URL`
  for anything with concurrent writers.
- **Idempotency keys** on `/orders` (POST) to guard against double-submits.
