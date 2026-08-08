"""
Adapter for SMS-Man's REST API (https://sms-man.com/site/api).
Often runs cheaper than 5SIM for high-volume routes (WhatsApp/Telegram/Google
on Nigeria and other African countries especially), so it's wired in as a
second, swappable option — just set PROVIDER=smsman and PROVIDER_API_KEY in
.env to switch. Same disclaimer as the 5sim adapter: this is a skeleton
matching their published docs, verify against the live reference before
production since providers change schemas without notice.

Auth: API key from your SMS-Man account (Profile -> API).
"""

from typing import Optional

import httpx

from app.config import settings
from app.providers.base import SMSProvider, ReservedNumber

BASE_URL = "https://api.sms-man.com/control"


class SmsManProvider(SMSProvider):
    name = "smsman"

    def __init__(self) -> None:
        self._params = {"token": settings.provider_api_key}

    async def get_price_usd(self, service: str, country: str) -> float:
        url = f"{BASE_URL}/limits"
        params = {**self._params, "country_id": country, "application_id": service}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        # Response shape: [{country_id, application_id, cost_place, ...}]
        try:
            cheapest = min(float(row["cost_place"]) for row in data)
            return cheapest
        except (KeyError, ValueError, TypeError):
            raise LookupError(f"No price found for {service}/{country}")

    async def reserve_number(self, service: str, country: str) -> ReservedNumber:
        url = f"{BASE_URL}/get-number"
        params = {**self._params, "country_id": country, "application_id": service}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        if "error_code" in data:
            raise LookupError(data.get("error_msg", "No numbers available"))
        return ReservedNumber(
            provider_order_id=str(data["request_id"]),
            phone_number=data["number"],
            cost_usd=float(data.get("cost", 0)),
        )

    async def check_sms(self, provider_order_id: str) -> Optional[str]:
        url = f"{BASE_URL}/get-sms"
        params = {**self._params, "request_id": provider_order_id}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        return data.get("sms_code")

    async def cancel_order(self, provider_order_id: str) -> None:
        url = f"{BASE_URL}/set-status"
        params = {**self._params, "request_id": provider_order_id, "status": "reject"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
