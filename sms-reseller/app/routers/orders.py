from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from app.auth import CurrentUser, get_current_user
from app.config import settings
from app.database import get_session
from app.models import LedgerEntry, Order, OrderStatus, Wallet
from app.pricing import price_for_customer
from app.providers import get_provider
from app.rate_limit import limiter
from app.schemas import OrderRead


router = APIRouter(
    prefix="/orders",
    tags=["orders"],
)


@router.get("", response_model=list[OrderRead])
def list_orders(
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Order history for the logged-in user.
    Newest orders are returned first.
    """
    orders = session.exec(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
    ).all()

    return orders


@router.get("/price")
@limiter.limit("30/minute")
async def preview_price(
    request: Request,
    service: str,
    country: str,
    session: Session = Depends(get_session),
):
    """
    Get the current cheapest available 5SIM price
    for a service and country.
    """

    service = service.strip().lower()
    country = country.strip().lower()

    if not service:
        raise HTTPException(
            status_code=400,
            detail="Service is required",
        )

    if not country:
        raise HTTPException(
            status_code=400,
            detail="Country is required",
        )

    provider = get_provider()

    try:
        cost_usd = await provider.get_price_usd(
            service,
            country,
        )

    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Provider error: {str(exc)}",
        )

    return {
        "service": service,
        "country": country,
        "cost_usd": cost_usd,
        "price_ngn": price_for_customer(cost_usd, session),
    }


@router.post("", response_model=OrderRead)
@limiter.limit("10/minute")
async def buy_number(
    request: Request,
    service: str,
    country: str,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Buy a phone number from the configured provider.
    """

    service = service.strip().lower()
    country = country.strip().lower()

    if not service:
        raise HTTPException(
            status_code=400,
            detail="Service is required",
        )

    if not country:
        raise HTTPException(
            status_code=400,
            detail="Country is required",
        )

    provider = get_provider()

    try:
        reserved = await provider.reserve_number(
            service,
            country,
        )

    except LookupError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Provider error: {str(exc)}",
        )

    price_ngn = price_for_customer(
        reserved.cost_usd, session
    )

    wallet = session.get(
        Wallet,
        user.id,
    )

    if wallet is None:
        raise HTTPException(
            status_code=500,
            detail="Wallet not found",
        )

    if wallet.wallet_balance_ngn < price_ngn:

        try:
            await provider.cancel_order(
                reserved.provider_order_id
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=402,
            detail="Insufficient wallet balance",
        )

    # Charge wallet.
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
        expires_at=(
            datetime.now(timezone.utc)
            + timedelta(
                seconds=settings.order_timeout_seconds
            )
        ),
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


@router.get(
    "/{order_id}",
    response_model=OrderRead,
)
@limiter.limit("40/minute")
async def check_order(
    request: Request,
    order_id: int,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Poll this endpoint from the frontend.

    SMS arrived:
        mark received.

    Timeout:
        cancel provider order and refund wallet.

    Still waiting:
        return pending.
    """

    order = session.get(
        Order,
        order_id,
    )

    if not order or order.user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.status != OrderStatus.pending:
        return order

    provider = get_provider()

    if (
        datetime.now(timezone.utc)
        > order.expires_at.replace(
            tzinfo=timezone.utc
        )
    ):
        try:
            await provider.cancel_order(
                order.provider_order_id
            )
        except Exception:
            pass

        _refund(
            order,
            user.id,
            session,
            reason="order_refund_timeout",
        )

        return order

    try:
        code = await provider.check_sms(
            order.provider_order_id
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Provider error: {str(exc)}",
        )

    if code:
        order.sms_code = code
        order.status = OrderStatus.received
        order.completed_at = datetime.now(
            timezone.utc
        )

        session.add(order)
        session.commit()
        session.refresh(order)

    return order


@router.post(
    "/{order_id}/cancel",
    response_model=OrderRead,
)
@limiter.limit("20/minute")
async def cancel_order(
    request: Request,
    order_id: int,
    user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    order = session.get(
        Order,
        order_id,
    )

    if not order or order.user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.status != OrderStatus.pending:
        raise HTTPException(
            status_code=400,
            detail=f"Order already {order.status}",
        )

    provider = get_provider()

    try:
        await provider.cancel_order(
            order.provider_order_id
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Provider error: {str(exc)}",
        )

    _refund(
        order,
        user.id,
        session,
        reason="order_refund_cancelled",
        status=OrderStatus.cancelled,
    )

    return order


def _refund(
    order: Order,
    user_id,
    session: Session,
    reason: str,
    status: OrderStatus = OrderStatus.expired,
) -> None:

    wallet = session.get(
        Wallet,
        user_id,
    )

    if wallet is None:
        raise RuntimeError(
            "Wallet not found during refund"
        )

    order.status = status

    order.completed_at = datetime.now(
        timezone.utc
    )

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