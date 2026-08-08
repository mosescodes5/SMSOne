from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ReservedNumber:
    provider_order_id: str
    phone_number: str
    cost_usd: float


class SMSProvider(ABC):
    """
    Common interface for upstream wholesale providers (5SIM, SMS-Activate, SMS-Man, ...).
    Implement one adapter per provider so routers/orders.py never needs to know
    which upstream is actually fulfilling the order.
    """

    name: str = "base"

    @abstractmethod
    async def get_price_usd(self, service: str, country: str) -> float:
        """Look up current wholesale cost for a service+country pair."""

    @abstractmethod
    async def reserve_number(self, service: str, country: str) -> ReservedNumber:
        """Buy/reserve a number from the provider. Raises on out-of-stock."""

    @abstractmethod
    async def check_sms(self, provider_order_id: str) -> Optional[str]:
        """Poll for the SMS code. Returns None if not arrived yet."""

    @abstractmethod
    async def cancel_order(self, provider_order_id: str) -> None:
        """Cancel/release a number, e.g. on timeout, so the provider can refund us."""
