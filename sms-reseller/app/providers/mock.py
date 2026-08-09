import random
import string
import uuid
from typing import Optional

from app.providers.base import SMSProvider, ReservedNumber

# Simulated wholesale price sheet, in USD. Swap for a real provider in production.
_MOCK_PRICES = {
    ("whatsapp", "nigeria"): 0.28,
    ("google", "nigeria"): 0.18,
    ("facebook", "nigeria"): 0.15,
    ("telegram", "nigeria"): 0.12,
}
_DEFAULT_PRICE = 0.20

# In-memory "arrived SMS" store, keyed by provider_order_id, purely for local testing.
_PENDING: dict[str, int] = {}  # order_id -> polls remaining before "SMS arrives"


class MockProvider(SMSProvider):
    name = "mock"

    async def get_price_usd(self, service: str, country: str) -> float:
        return _MOCK_PRICES.get((service.lower(), country.lower()), _DEFAULT_PRICE)

    async def reserve_number(self, service: str, country: str, operator: str = "any") -> ReservedNumber:
        order_id = str(uuid.uuid4())
        fake_number = "+234" + "".join(random.choices(string.digits, k=10))
        _PENDING[order_id] = random.randint(2, 5)  # arrives after a few polls
        cost = await self.get_price_usd(service, country)
        return ReservedNumber(
            provider_order_id=order_id, phone_number=fake_number, cost_usd=cost
        )

    async def check_sms(self, provider_order_id: str) -> Optional[str]:
        remaining = _PENDING.get(provider_order_id)
        if remaining is None:
            return None
        if remaining <= 0:
            return "".join(random.choices(string.digits, k=6))
        _PENDING[provider_order_id] = remaining - 1
        return None

    async def cancel_order(self, provider_order_id: str) -> None:
        _PENDING.pop(provider_order_id, None)
