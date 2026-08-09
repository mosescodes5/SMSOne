import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel

from app.models import OrderStatus


class UserRead(SQLModel):
    id: uuid.UUID
    email: str
    wallet_balance_ngn: float
    is_admin: bool = False


class OrderRead(SQLModel):
    id: int
    service: str
    country: str
    provider_name: str
    phone_number: str
    price_ngn: float
    status: OrderStatus
    sms_code: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    completed_at: Optional[datetime] = None


class OfferRead(SQLModel):
    """One purchasable pool for a service+country — what the buy screen lists."""
    operator: str
    price_ngn: float
    success_rate: Optional[float] = None  # 0-100
    available: Optional[int] = None


class LedgerEntryRead(SQLModel):
    id: int
    amount_ngn: float
    reason: str
    order_id: Optional[int] = None
    balance_after_ngn: float
    created_at: datetime


# ---------- Admin ----------


class AdminUserRead(SQLModel):
    user_id: uuid.UUID
    email: Optional[str] = None
    wallet_balance_ngn: float
    is_admin: bool
    is_suspended: bool
    created_at: datetime


class WalletAdjustRequest(SQLModel):
    amount_ngn: float  # positive = credit, negative = debit
    reason: str


class AdminOrderRead(OrderRead):
    user_id: uuid.UUID
    user_email: Optional[str] = None


class SiteSettingsRead(SQLModel):
    whatsapp_group_url: str = ""
    telegram_url: str = ""
    support_ticket_url: str = ""
    support_email: str = ""
    support_phone: str = ""
    announcement: str = ""


class PricingTier(SQLModel):
    max_cost_ngn: Optional[float] = None  # None = catch-all (applies above all other tiers)
    markup_percent: float
    markup_flat_ngn: float


class PricingSettingsRead(SQLModel):
    usd_ngn_rate: float
    min_price_ngn: float
    tiers: list[PricingTier]


class AdminStatsRead(SQLModel):
    total_users: int
    total_orders: int
    orders_pending: int
    orders_received: int
    total_wallet_balance_ngn: float
    total_revenue_ngn: float  # sum of order_charge ledger entries (negative -> flipped positive)
    total_topups_ngn: float
    total_provider_cost_ngn: float  # what received orders cost us, at current USD/NGN rate
    total_profit_ngn: float  # total_revenue_ngn - total_provider_cost_ngn (received orders only)
    profit_margin_pct: float
