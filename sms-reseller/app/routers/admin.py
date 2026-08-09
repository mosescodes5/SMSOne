import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func

from app.auth import CurrentUser, require_admin
from app.database import get_session
from app.models import LedgerEntry, Order, SiteSetting, Wallet
from app.pricing import get_pricing_config, save_pricing_config
from app.routers.settings import DEFAULTS
from app.schemas import (
    AdminOrderRead,
    AdminStatsRead,
    AdminUserRead,
    OrderRead,
    PricingSettingsRead,
    SiteSettingsRead,
    WalletAdjustRequest,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------- Site settings (WhatsApp/Telegram/support links, etc.) ----------


@router.get("/settings", response_model=SiteSettingsRead)
def get_settings(session: Session = Depends(get_session)):
    rows = session.exec(select(SiteSetting)).all()
    values = {**DEFAULTS, **{r.key: r.value for r in rows}}
    return SiteSettingsRead(**values)


@router.put("/settings", response_model=SiteSettingsRead)
def update_settings(payload: SiteSettingsRead, session: Session = Depends(get_session)):
    for key, value in payload.model_dump().items():
        row = session.get(SiteSetting, key)
        if row is None:
            row = SiteSetting(key=key, value=value)
        else:
            row.value = value
        session.add(row)
    session.commit()
    return get_settings(session)


# ---------- Pricing (markup knobs) ----------


@router.get("/pricing", response_model=PricingSettingsRead)
def get_pricing(session: Session = Depends(get_session)):
    return PricingSettingsRead(**get_pricing_config(session))


@router.put("/pricing", response_model=PricingSettingsRead)
def update_pricing(payload: PricingSettingsRead, session: Session = Depends(get_session)):
    if not payload.tiers:
        raise HTTPException(status_code=400, detail="At least one pricing tier is required.")
    save_pricing_config(
        session,
        usd_ngn_rate=payload.usd_ngn_rate,
        min_price_ngn=payload.min_price_ngn,
        tiers=[t.model_dump() for t in payload.tiers],
    )
    return get_pricing(session)


# ---------- Users ----------


@router.get("/users", response_model=list[AdminUserRead])
def list_users(
    q: Optional[str] = Query(default=None, description="Filter by email substring"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    session: Session = Depends(get_session),
):
    stmt = select(Wallet).order_by(Wallet.created_at.desc())
    if q:
        stmt = stmt.where(Wallet.email.ilike(f"%{q}%"))
    stmt = stmt.offset(offset).limit(limit)
    return session.exec(stmt).all()


@router.post("/users/{user_id}/adjust-wallet", response_model=AdminUserRead)
def adjust_wallet(
    user_id: uuid.UUID,
    payload: WalletAdjustRequest,
    admin: CurrentUser = Depends(require_admin),
    session: Session = Depends(get_session),
):
    wallet = session.get(Wallet, user_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="User not found")

    wallet.wallet_balance_ngn += payload.amount_ngn
    session.add(wallet)
    session.add(
        LedgerEntry(
            user_id=wallet.user_id,
            amount_ngn=payload.amount_ngn,
            reason=f"admin_adjust: {payload.reason}" if payload.reason else "admin_adjust",
            balance_after_ngn=wallet.wallet_balance_ngn,
        )
    )
    session.commit()
    session.refresh(wallet)
    return wallet


@router.post("/users/{user_id}/suspend", response_model=AdminUserRead)
def suspend_user(user_id: uuid.UUID, session: Session = Depends(get_session)):
    wallet = session.get(Wallet, user_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="User not found")
    wallet.is_suspended = True
    session.add(wallet)
    session.commit()
    session.refresh(wallet)
    return wallet


@router.post("/users/{user_id}/unsuspend", response_model=AdminUserRead)
def unsuspend_user(user_id: uuid.UUID, session: Session = Depends(get_session)):
    wallet = session.get(Wallet, user_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="User not found")
    wallet.is_suspended = False
    session.add(wallet)
    session.commit()
    session.refresh(wallet)
    return wallet


@router.post("/users/{user_id}/toggle-admin", response_model=AdminUserRead)
def toggle_admin(
    user_id: uuid.UUID,
    admin: CurrentUser = Depends(require_admin),
    session: Session = Depends(get_session),
):
    wallet = session.get(Wallet, user_id)
    if wallet is None:
        raise HTTPException(status_code=404, detail="User not found")
    if str(wallet.user_id) == str(admin.id):
        raise HTTPException(status_code=400, detail="You can't change your own admin status here.")
    wallet.is_admin = not wallet.is_admin
    session.add(wallet)
    session.commit()
    session.refresh(wallet)
    return wallet


# ---------- Orders (all users) ----------


@router.get("/orders", response_model=list[AdminOrderRead])
def list_all_orders(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    session: Session = Depends(get_session),
):
    stmt = select(Order).order_by(Order.created_at.desc())
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    stmt = stmt.offset(offset).limit(limit)
    orders = session.exec(stmt).all()

    # Cheap N+1 avoidance: one extra query to map user_id -> email.
    user_ids = {o.user_id for o in orders}
    emails = {}
    if user_ids:
        wallets = session.exec(select(Wallet).where(Wallet.user_id.in_(user_ids))).all()
        emails = {w.user_id: w.email for w in wallets}

    return [
        AdminOrderRead(**OrderRead.model_validate(o).model_dump(), user_id=o.user_id, user_email=emails.get(o.user_id))
        for o in orders
    ]


# ---------- Stats ----------


@router.get("/stats", response_model=AdminStatsRead)
def get_stats(session: Session = Depends(get_session)):
    total_users = session.exec(select(func.count()).select_from(Wallet)).one()
    total_orders = session.exec(select(func.count()).select_from(Order)).one()
    orders_pending = session.exec(select(func.count()).select_from(Order).where(Order.status == "pending")).one()
    orders_received = session.exec(select(func.count()).select_from(Order).where(Order.status == "received")).one()
    total_wallet_balance = session.exec(select(func.coalesce(func.sum(Wallet.wallet_balance_ngn), 0.0))).one()

    revenue = session.exec(
        select(func.coalesce(func.sum(LedgerEntry.amount_ngn), 0.0)).where(LedgerEntry.reason == "order_charge")
    ).one()
    topups = session.exec(
        select(func.coalesce(func.sum(LedgerEntry.amount_ngn), 0.0)).where(
            LedgerEntry.reason.in_(["topup_korapay", "topup_dev"])
        )
    ).one()

    # Provider cost is only known in USD per order (Order.cost_usd) — convert
    # using the *current* usd_ngn_rate. This is an approximation for older
    # orders bought when the rate was different; good enough for a running
    # profit picture, not exact historical accounting. Only counts "received"
    # orders — pending/cancelled/expired orders were refunded, so they're a
    # wash (you paid nothing net, or the provider itself refunded you).
    cost_usd_total = session.exec(
        select(func.coalesce(func.sum(Order.cost_usd), 0.0)).where(Order.status == "received")
    ).one()
    current_rate = get_pricing_config(session)["usd_ngn_rate"]
    total_provider_cost_ngn = cost_usd_total * current_rate

    total_revenue_ngn = abs(revenue)  # order_charge entries are stored negative
    total_profit_ngn = total_revenue_ngn - total_provider_cost_ngn
    profit_margin_pct = (total_profit_ngn / total_revenue_ngn * 100) if total_revenue_ngn else 0.0

    return AdminStatsRead(
        total_users=total_users,
        total_orders=total_orders,
        orders_pending=orders_pending,
        orders_received=orders_received,
        total_wallet_balance_ngn=total_wallet_balance,
        total_revenue_ngn=total_revenue_ngn,
        total_topups_ngn=topups,
        total_provider_cost_ngn=round(total_provider_cost_ngn, 2),
        total_profit_ngn=round(total_profit_ngn, 2),
        profit_margin_pct=round(profit_margin_pct, 1),
    )
