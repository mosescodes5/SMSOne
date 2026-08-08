from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import CurrentUser, get_current_user
from app.database import get_session
from app.models import LedgerEntry, Wallet
from app.schemas import LedgerEntryRead

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/balance")
def get_balance(user: CurrentUser = Depends(get_current_user)):
    return {"wallet_balance_ngn": user.wallet_balance_ngn}


@router.post("/topup/dev-only")
def topup_dev_only(
    amount_ngn: float,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Local testing ONLY — credits the wallet with no real payment involved.
    For real top-ups, the frontend calls POST /payments/korapay/initialize and
    the wallet is credited by the /payments/korapay/webhook handler once Korapay
    confirms the charge. Delete or gate this route behind a DEBUG flag before
    deploying, since anyone with a valid Supabase session could call it to
    mint free balance.
    """
    if amount_ngn <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    wallet = session.get(Wallet, user.id)
    wallet.wallet_balance_ngn += amount_ngn
    session.add(wallet)
    session.add(
        LedgerEntry(
            user_id=user.id,
            amount_ngn=amount_ngn,
            reason="topup_dev",
            balance_after_ngn=wallet.wallet_balance_ngn,
        )
    )
    session.commit()
    session.refresh(wallet)
    return {"wallet_balance_ngn": wallet.wallet_balance_ngn}


@router.get("/ledger", response_model=list[LedgerEntryRead])
def get_ledger(user: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)):
    entries = session.exec(
        select(LedgerEntry).where(LedgerEntry.user_id == user.id).order_by(LedgerEntry.created_at.desc())
    ).all()
    return entries
