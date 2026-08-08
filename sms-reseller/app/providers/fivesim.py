"""
Adapter for 5sim.net's public REST API (https://docs.5sim.net).
This is a skeleton: endpoints/response shapes are correct as of their published
docs, but you should verify against the live API reference before going to
production, since providers change their schemas without much notice.

Auth: Bearer token from your 5sim account (Profile -> API key).
"""

from typing import Optional

import httpx

from app.config import settings
from app.providers.base import SMSProvider, ReservedNumber

BASE_URL = "https://5sim.net/v1"


class FiveSimProvider(SMSProvider):
    name = "fivesim"

    def __init__(self) -> None:
        self._headers = {
            "Authorization": f"Bearer {settings.provider_api_key}",
            "Accept": "application/json",
        }

    async def get_price_usd(self, service: str, country: str) -> float:
        url = f"{BASE_URL}/guest/prices"
        params = {"country": country, "product": service}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=self._headers)
            resp.raise_for_status()
            data = resp.json()
        # Response shape: {country: {product: {operator: {cost, count, rate}}}}
        try:
            operators = data[country][service]
            cheapest = min(op["cost"] for op in operators.values())
            return float(cheapest)
        except (KeyError, ValueError):
            raise LookupError(f"No price found for {service}/{country}")

    async def reserve_number(self, service: str, country: str) -> ReservedNumber:
        url = f"{BASE_URL}/user/buy/activation/{country}/any/{service}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers)
            resp.raise_for_status()
            data = resp.json()
        return ReservedNumber(
            provider_order_id=str(data["id"]),
            phone_number=data["phone"],
            cost_usd=float(data["price"]),
        )

    async def check_sms(self, provider_order_id: str) -> Optional[str]:
        url = f"{BASE_URL}/user/check/{provider_order_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers)
            resp.raise_for_status()
            data = resp.json()
        sms_list = data.get("sms") or []
        if sms_list:
            return sms_list[0].get("code")
        return None

    async def cancel_order(self, provider_order_id: str) -> None:
        url = f"{BASE_URL}/user/cancel/{provider_order_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._headers)
            resp.raise_for_status()
