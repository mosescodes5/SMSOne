from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ReservedNumber:
    provider_order_id: str
    phone_number: str
    cost_usd: float


@dataclass
class Offer:
    """
    One purchasable option for a service+country pair. Providers that only
    have a single price (SMS-Man, Mock) return one of these; providers with
    multiple operator pools per country (5SIM) return several, so the
    customer can pick between e.g. a cheaper/lower-success-rate number and a
    pricier/more-reliable one.
    """
    operator: str  # provider-specific pool/operator id, passed back into reserve_number
    cost_usd: float
    success_rate: Optional[float] = None  # 0-100, when the provider reports one
    available: Optional[int] = None


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

    async def list_offers(self, service: str, country: str) -> list[Offer]:
        """
        All currently purchasable options for a service+country pair.
        Default implementation just wraps get_price_usd as a single
        "any operator" offer — override this for providers that expose
        multiple pools with different prices/success rates (e.g. 5SIM).
        """
        cost = await self.get_price_usd(service, country)
        return [Offer(operator="any", cost_usd=cost)]

    @abstractmethod
    async def reserve_number(self, service: str, country: str, operator: str = "any") -> ReservedNumber:
        """
        Buy/reserve a number from the provider. `operator` is one of the
        values returned by list_offers() — "any" lets the provider pick
        automatically, which every adapter must support as the default.
        Raises on out-of-stock.
        """

    @abstractmethod
    async def check_sms(self, provider_order_id: str) -> Optional[str]:
        """Poll for the SMS code. Returns None if not arrived yet."""

    @abstractmethod
    async def cancel_order(self, provider_order_id: str) -> None:
        """Cancel/release a number, e.g. on timeout, so the provider can refund us."""
