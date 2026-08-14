"""
Korapay integration (https://developers.korapay.com).

Flow:
1. Frontend calls POST /payments/korapay/initialize -> we ask Korapay for a
   checkout URL/reference and return it to the frontend.
2. User pays on Korapay's hosted page (or your embedded widget).
3. Korapay calls OUR webhook (POST /payments/korapay/webhook) when the payment
   settles. We verify the signature, then verify the transaction status
   server-side via Korapay's API before crediting the wallet. Never trust the
   webhook payload alone, and never credit a wallet from a client-side call.

Two API keys from your Korapay dashboard:
  - Public key: safe to expose to frontend, used to init the checkout widget.
  - Secret key: server-side only, used for verification + webhook signature check.
"""

import hashlib
import hmac
from typing import Optional

import httpx

from app.config import settings

BASE_URL = "https://api.korapay.com/merchant/api/v1"


class KorapayError(Exception):
    pass


def _headers() -> dict:
    if not settings.korapay_secret_key:
        raise KorapayError("KORAPAY_SECRET_KEY is not configured")
    return {
        "Authorization": f"Bearer {settings.korapay_secret_key}",
        "Content-Type": "application/json",
    }


async def initialize_charge(
    *, amount_ngn: float, customer_email: str, reference: str, redirect_url: str
) -> dict:
    """
    Creates a hosted checkout charge. Returns Korapay's response, which includes
    a `checkout_url` to redirect the user to (or a client-side widget can use
    the reference directly — see Korapay's inline JS docs).
    """
    payload = {
        # Korapay's docs specify `amount` as an Integer. Sending a Python
        # float (e.g. 2000.0) serializes to JSON as "2000.0" — a different
        # wire type than "2000" — which their validator rejects outright as
        # "One or more fields are invalid", even though the value itself is
        # a whole number. round() first so a stray 2000.4x from the frontend
        # doesn't silently get truncated down instead of rounded.
        "amount": int(round(amount_ngn)),
        "currency": "NGN",
        "reference": reference,
        "customer": {"email": customer_email, "name": customer_email.split("@")[0]},
        "redirect_url": redirect_url,
        "narration": "Wallet top-up",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BASE_URL}/charges/initialize", json=payload, headers=_headers()
            )
    except httpx.HTTPError as e:
        raise KorapayError(f"Could not reach Korapay: {e}")

    try:
        data = resp.json()
    except ValueError:
        raise KorapayError(f"Korapay returned a non-JSON response (status {resp.status_code})")

    if not data.get("status"):
        # Korapay's own docs: on invalid-data errors, the *specific* field
        # problem lives in the nested `data` object, not the top-level
        # `message` (which is just a generic "one or more fields are
        # invalid" wrapper). Surface both, or we're debugging blind.
        detail = data.get("message", "Korapay charge initialization failed")
        field_errors = data.get("data")
        if field_errors:
            detail = f"{detail} — details: {field_errors}"
        raise KorapayError(detail)
    return data["data"]


async def verify_transaction(reference: str) -> dict:
    """
    Always call this from your webhook handler before crediting a wallet —
    never trust the webhook body's amount/status directly, since a forged
    request could otherwise credit arbitrary amounts.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{BASE_URL}/charges/{reference}", headers=_headers()
            )
    except httpx.HTTPError as e:
        raise KorapayError(f"Could not reach Korapay: {e}")

    try:
        data = resp.json()
    except ValueError:
        raise KorapayError(f"Korapay returned a non-JSON response (status {resp.status_code})")

    if not data.get("status"):
        raise KorapayError(data.get("message", "Could not verify transaction"))
    return data["data"]


def verify_webhook_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """
    Korapay signs webhooks with HMAC-SHA256 of the raw body using your secret key.
    Reject anything that doesn't match — this is what stops someone from POSTing
    a fake "payment successful" event straight to your webhook URL.
    """
    if not signature_header or not settings.korapay_secret_key:
        return False
    expected = hmac.new(
        settings.korapay_secret_key.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
