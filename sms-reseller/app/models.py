import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OrderStatus(str, Enum):
    pending = "pending"       # number reserved, waiting for SMS
    received = "received"     # SMS arrived, user charged
    expired = "expired"       # timed out, auto-refunded
    cancelled = "cancelled"   # user cancelled, refunded


class Wallet(SQLModel, table=True):
    """
    Replaces the old User table. Auth itself now lives entirely in
    Supabase's own auth.users table (managed by Supabase, not this app) —
    this table exists only to hold the things our app actually owns:
    wallet balance, admin/suspension flags, and a cached copy of the email
    (handy for the admin panel without needing the Supabase service-role
    API). `user_id` is the Supabase Auth user's UUID, and a row here is
    created automatically by a Postgres trigger the moment someone signs up
    (see supabase_schema.sql) — the backend never inserts a row here itself
    except as a local-dev/SQLite fallback (see get_or_create_wallet).
    """
    __tablename__ = "wallets"

    user_id: uuid.UUID = Field(primary_key=True)
    email: Optional[str] = None
    wallet_balance_ngn: float = 0.0
    is_admin: bool = False
    is_suspended: bool = False
    created_at: datetime = Field(default_factory=utcnow)


class SiteSetting(SQLModel, table=True):
    """
    Simple key/value store for things the admin panel lets you edit without
    a redeploy — WhatsApp group link, Telegram channel, support contact,
    etc. Read publicly via GET /settings, written only via the admin router.
    """
    __tablename__ = "site_settings"

    key: str = Field(primary_key=True)
    value: str = ""
    updated_at: datetime = Field(default_factory=utcnow)


class LedgerEntry(SQLModel, table=True):
    """Every wallet movement, for auditing. Never delete rows here."""
    __tablename__ = "ledger_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="wallets.user_id", index=True)
    amount_ngn: float  # positive = credit, negative = debit
    reason: str        # "topup_korapay", "order_charge", "order_refund_timeout", ...
    order_id: Optional[int] = Field(default=None, foreign_key="orders.id")
    balance_after_ngn: float
    created_at: datetime = Field(default_factory=utcnow)


class PaymentStatus(str, Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class PendingPayment(SQLModel, table=True):
    """
    Tracks a Korapay charge from initialization to confirmation.
    `reference` is our own generated ID (not Korapay's internal ID), passed to
    Korapay when we initialize the charge, and used to match the webhook back
    to a user + amount. `status` starts pending and is only ever flipped by
    server-side verification against Korapay's API — never by trusting the
    webhook body alone.
    """
    __tablename__ = "pending_payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    reference: str = Field(unique=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="wallets.user_id", index=True)
    amount_ngn: float
    status: PaymentStatus = PaymentStatus.pending
    created_at: datetime = Field(default_factory=utcnow)
    confirmed_at: Optional[datetime] = None


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="wallets.user_id", index=True)

    service: str          # e.g. "whatsapp", "google"
    country: str          # e.g. "nigeria"

    provider_name: str            # which upstream adapter fulfilled this
    provider_order_id: str        # id from the upstream provider, for polling/cancel
    phone_number: str

    cost_usd: float        # what WE paid the provider
    price_ngn: float       # what the USER is charged (cost + markup)

    status: OrderStatus = OrderStatus.pending
    sms_code: Optional[str] = None

    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime
    completed_at: Optional[datetime] = None
