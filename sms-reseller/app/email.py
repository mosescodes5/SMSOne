"""
Transactional email via Brevo's REST API (no SDK dependency — it's a
one-endpoint JSON POST, not worth the extra package).

Scope: this handles emails Supabase Auth *doesn't* send — order receipts,
wallet top-up confirmations, low-balance nudges. For account
verification/password-reset, point Supabase's own SMTP settings at Brevo
instead (see config.py's comment on brevo_api_key) — don't try to replicate
Supabase's auth email flow here, that's a losing battle against their
built-in confirm/reset token handling.

Every call in here is best-effort: a failed email should never break the
actual transaction (an order still goes through, a wallet still gets
credited) — so every send_email() call site wraps it in try/except and just
logs on failure rather than raising.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger("relay.email")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


async def send_email(to_email: str, subject: str, html_content: str, to_name: str = "") -> None:
    """
    Fire off one transactional email via Brevo. Raises on failure — callers
    at the actual transaction sites should catch and log, not let an email
    hiccup fail the underlying order/payment/etc.
    """
    if not settings.brevo_api_key:
        logger.info("BREVO_API_KEY not set — skipping email to %s: %s", to_email, subject)
        return

    payload = {
        "sender": {"email": settings.brevo_sender_email, "name": settings.brevo_sender_name},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }
    headers = {
        "api-key": settings.brevo_api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(BREVO_API_URL, json=payload, headers=headers)

    if response.status_code >= 400:
        raise RuntimeError(f"Brevo send failed ({response.status_code}): {response.text}")


async def send_email_safe(to_email: str, subject: str, html_content: str, to_name: str = "") -> None:
    """send_email, but swallows and logs errors — use this at call sites."""
    try:
        await send_email(to_email, subject, html_content, to_name)
    except Exception as exc:
        logger.warning("Email to %s failed (subject=%r): %s", to_email, subject, exc)


# ---------------------------------------------------------------------------
# Templates — kept simple/inline rather than pulling in a templating engine
# for a handful of short transactional emails. Brand color pulled from the
# frontend's --mint accent so these don't look like they came from a
# different product.
# ---------------------------------------------------------------------------

_WRAPPER = """
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <div style="font-weight: 700; font-size: 18px; margin-bottom: 20px;">
    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2CE6A6;margin-right:8px;"></span>
    {brand}
  </div>
  {body}
  <p style="color:#8a8f98;font-size:12px;margin-top:32px;">
    This is an automated message from {brand}. If you didn't expect this email, you can ignore it.
  </p>
</div>
"""


def _wrap(body_html: str) -> str:
    return _WRAPPER.format(brand=settings.brevo_sender_name, body=body_html)


def order_receipt_email(service: str, country: str, phone_number: str, sms_code: str, price_ngn: float) -> tuple[str, str]:
    subject = f"Your {service.title()} number is ready — code: {sms_code}"
    html = _wrap(f"""
        <p>Your number came through and the code arrived:</p>
        <div style="background:#f5f6f8;border-radius:10px;padding:16px;margin:16px 0;">
          <div style="font-size:12px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">SMS Code</div>
          <div style="font-family:monospace;font-size:24px;font-weight:700;letter-spacing:.05em;">{sms_code}</div>
        </div>
        <p style="font-size:14px;color:#4a4f57;">
          Service: <strong>{service.title()}</strong><br/>
          Country: <strong>{country.title()}</strong><br/>
          Number: <strong style="font-family:monospace;">{phone_number}</strong><br/>
          Charged: <strong>₦{price_ngn:,.0f}</strong>
        </p>
    """)
    return subject, html


def topup_receipt_email(amount_ngn: float, new_balance_ngn: float) -> tuple[str, str]:
    subject = f"Wallet funded — ₦{amount_ngn:,.0f}"
    html = _wrap(f"""
        <p>Your wallet top-up went through.</p>
        <div style="background:#f5f6f8;border-radius:10px;padding:16px;margin:16px 0;">
          <div style="font-size:12px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Amount added</div>
          <div style="font-family:monospace;font-size:24px;font-weight:700;">₦{amount_ngn:,.0f}</div>
        </div>
        <p style="font-size:14px;color:#4a4f57;">New balance: <strong>₦{new_balance_ngn:,.0f}</strong></p>
    """)
    return subject, html


def low_balance_email(balance_ngn: float) -> tuple[str, str]:
    subject = "Your wallet balance is running low"
    html = _wrap(f"""
        <p>Your wallet balance is down to <strong>₦{balance_ngn:,.0f}</strong> — top up to keep buying numbers without interruption.</p>
    """)
    return subject, html
