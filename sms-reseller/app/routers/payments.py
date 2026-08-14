import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from app.auth import CurrentUser, get_current_user
from app.config import settings
from app.database import get_session
from app.email import send_email_safe, topup_receipt_email
from app.models import LedgerEntry, PaymentStatus, PendingPayment, Wallet
from app.payments.korapay import (
    KorapayError,
    initialize_charge,
    verify_transaction,
    verify_webhook_signature,
)
from app.rate_limit import limiter

logger = logging.getLogger("relay.payments")

router = APIRouter(prefix="/payments/korapay", tags=["payments"])

MIN_TOPUP_NGN = 100
MAX_TOPUP_NGN = 500_000  # sanity ceiling; tune to your risk appetite


@router.post("/initialize")
@limiter.limit("5/minute")
async def initialize_topup(
    request: Request,
    amount_ngn: float,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not (MIN_TOPUP_NGN <= amount_ngn <= MAX_TOPUP_NGN):
        raise HTTPException(
            status_code=400,
            detail=f"Amount must be between {MIN_TOPUP_NGN} and {MAX_TOPUP_NGN} NGN",
        )

    # Korapay caps `reference` at 50 characters. The full UUID (36 chars
    # with hyphens) plus a "topup_" prefix and random suffix blew past that
    # — .hex strips the hyphens (32→ chars) and we only need a fragment of
    # it for human-readability in Korapay's dashboard anyway, since the DB
    # row (not the reference string) is what actually links this back to
    # the user. 16 hex chars of randomness (64 bits) is still effectively
    # collision-proof for a unique-reference requirement.
    reference = f"tp_{user.id.hex[:8]}_{uuid.uuid4().hex[:16]}"

    payment = PendingPayment(reference=reference, user_id=user.id, amount_ngn=amount_ngn)
    session.add(payment)
    session.commit()

    try:
        charge = await initialize_charge(
            amount_ngn=amount_ngn,
            customer_email=user.email,
            reference=reference,
            redirect_url=settings.korapay_redirect_url,
        )
    except KorapayError as e:
        payment.status = PaymentStatus.failed
        session.add(payment)
        session.commit()
        # Full detail (including Korapay's field-level errors) goes to your
        # server logs even if the frontend only shows a shortened version —
        # check `uvicorn`/your host's logs for the exact rejected field.
        logger.warning(
            "Korapay initialize failed for user=%s amount=%s reference=%s: %s",
            user.id, amount_ngn, reference, e,
        )
        raise HTTPException(status_code=502, detail=f"Payment provider error: {e}")

    # charge typically includes {"checkout_url": ..., "reference": ...}
    return {"reference": reference, "checkout_url": charge.get("checkout_url")}


@router.post("/webhook")
async def korapay_webhook(request: Request, session: Session = Depends(get_session)):
    raw_body = await request.body()
    signature = request.headers.get("x-korapay-signature")

    if not verify_webhook_signature(raw_body, signature):
        # Don't leak *why* it failed — just refuse it.
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    reference = payload.get("data", {}).get("reference")
    if not reference:
        raise HTTPException(status_code=400, detail="Missing reference")

    payment = session.exec(
        select(PendingPayment).where(PendingPayment.reference == reference)
    ).first()
    if not payment:
        # Reference we don't recognize — ignore rather than error, some gateways
        # retry aggressively and we don't want to leak info via error codes.
        return {"status": "ignored"}

    if payment.status == PaymentStatus.success:
        # Already credited — webhooks can and will arrive more than once.
        return {"status": "already_processed"}

    # Never trust payload.status directly. Re-verify server-side against Korapay.
    try:
        verified = await verify_transaction(reference)
    except KorapayError:
        raise HTTPException(status_code=502, detail="Could not verify with provider")

    if verified.get("status") != "success":
        payment.status = PaymentStatus.failed
        session.add(payment)
        session.commit()
        return {"status": "not_successful"}

    verified_amount = float(verified.get("amount", 0))
    if verified_amount < payment.amount_ngn:
        # Paid less than expected — do not credit the originally requested amount.
        raise HTTPException(status_code=400, detail="Amount mismatch")

    wallet = session.get(Wallet, payment.user_id)
    wallet.wallet_balance_ngn += payment.amount_ngn
    payment.status = PaymentStatus.success

    from datetime import datetime, timezone
    payment.confirmed_at = datetime.now(timezone.utc)

    session.add(wallet)
    session.add(payment)
    session.add(
        LedgerEntry(
            user_id=wallet.user_id,
            amount_ngn=payment.amount_ngn,
            reason="topup_korapay",
            balance_after_ngn=wallet.wallet_balance_ngn,
        )
    )
    session.commit()

    if wallet.email:
        await send_email_safe(
            wallet.email,
            *topup_receipt_email(payment.amount_ngn, wallet.wallet_balance_ngn),
        )

    return {"status": "credited"}


@router.get("/status/{reference}")
def payment_status(
    reference: str,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Frontend polls this after redirect, in case the webhook is delayed."""
    payment = session.exec(
        select(PendingPayment).where(PendingPayment.reference == reference)
    ).first()
    if not payment or payment.user_id != user.id:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"reference": payment.reference, "status": payment.status}
