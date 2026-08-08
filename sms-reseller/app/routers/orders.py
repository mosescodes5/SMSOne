from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import CurrentUser, get_current_user
from app.config import settings
from app.database import get_session
from app.models import LedgerEntry, Order, OrderStatus, Wallet
from app.pricing import price_for_customer
from app.providers import get_provider
from app.schemas import OrderRead

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderRead])
def list_orders(
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Order history / purchase log for the logged-in user, newest first."""
    orders = session.exec(
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    ).all()
    return orders


@router.get("/price")
async def preview_price(service: str, country: str):
    """Let the frontend show a price before the user commits to buying."""
    provider = get_provider()
    try:
        cost_usd = await provider.get_price_usd(service, country)
    except LookupError:
        raise HTTPException(status_code=404, detail="No numbers available for that service/country")
    return {"service": service, "country": country, "price_ngn": price_for_customer(cost_usd)}


@router.post("", response_model=OrderRead)
async def buy_number(
    service: str,
    country: str,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    provider = get_provider()

    try:
        reserved = await provider.reserve_number(service, country)
    except LookupError:
        raise HTTPException(status_code=404, detail="No numbers available for that service/country")

    price_ngn = price_for_customer(reserved.cost_usd)
    wallet = session.get(Wallet, user.id)

    if wallet.wallet_balance_ngn < price_ngn:
        await provider.cancel_order(reserved.provider_order_id)  # release what we reserved
        raise HTTPException(status_code=402, detail="Insufficient wallet balance")

    # Charge the wallet now; refunded automatically if the SMS never arrives.
    wallet.wallet_balance_ngn -= price_ngn
    order = Order(
        user_id=user.id,
        service=service,
        country=country,
        provider_name=provider.name,
        provider_order_id=reserved.provider_order_id,
        phone_number=reserved.phone_number,
        cost_usd=reserved.cost_usd,
        price_ngn=price_ngn,
        status=OrderStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.order_timeout_seconds),
    )
    session.add(wallet)
    session.add(order)
    session.commit()
    session.refresh(order)

    session.add(
        LedgerEntry(
            user_id=user.id,
            amount_ngn=-price_ngn,
            reason="order_charge",
            order_id=order.id,
            balance_after_ngn=wallet.wallet_balance_ngn,
        )
    )
    session.commit()

    return order


@router.get("/{order_id}", response_model=OrderRead)
async def check_order(
    order_id: int,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Poll this from the frontend every few seconds. Handles three outcomes:
    SMS arrived -> mark received. Timed out -> auto-refund. Still waiting -> pending.
    """
    order = session.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.pending:
        return order

    provider = get_provider()

    if datetime.now(timezone.utc) > order.expires_at.replace(tzinfo=timezone.utc):
        await provider.cancel_order(order.provider_order_id)
        _refund(order, user.id, session, reason="order_refund_timeout")
        return order

    code = await provider.check_sms(order.provider_order_id)
    if code:
        order.sms_code = code
        order.status = OrderStatus.received
        order.completed_at = datetime.now(timezone.utc)
        session.add(order)
        session.commit()
        session.refresh(order)

    return order


@router.post("/{order_id}/cancel", response_model=OrderRead)
async def cancel_order(
    order_id: int,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    order = session.get(Order, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail=f"Order already {order.status}")

    provider = get_provider()
    await provider.cancel_order(order.provider_order_id)
    _refund(order, user.id, session, reason="order_refund_cancelled", status=OrderStatus.cancelled)
    return order


def _refund(
    order: Order,
    user_id,
    session: Session,
    reason: str,
    status: OrderStatus = OrderStatus.expired,
) -> None:
    wallet = session.get(Wallet, user_id)
    order.status = status
    order.completed_at = datetime.now(timezone.utc)
    wallet.wallet_balance_ngn += order.price_ngn

    session.add(order)
    session.add(wallet)
    session.add(
        LedgerEntry(
            user_id=user_id,
            amount_ngn=order.price_ngn,
            reason=reason,
            order_id=order.id,
            balance_after_ngn=wallet.wallet_balance_ngn,
        )
    )
    session.commit()
