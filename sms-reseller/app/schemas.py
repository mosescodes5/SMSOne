import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel

from app.models import OrderStatus


class UserRead(SQLModel):
    id: uuid.UUID
    email: str
    wallet_balance_ngn: float


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


class LedgerEntryRead(SQLModel):
    id: int
    amount_ngn: float
    reason: str
    order_id: Optional[int] = None
    balance_after_ngn: float
    created_at: datetime
