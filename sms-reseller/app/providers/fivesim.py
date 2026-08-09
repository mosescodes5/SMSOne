"""
5SIM provider adapter.

Uses the 5SIM public REST API:
https://docs.5sim.net

The API key is kept on the backend and is never exposed to the frontend.
"""

from typing import Optional

import httpx

from app.config import settings
from app.providers.base import SMSProvider, ReservedNumber, Offer


BASE_URL = settings.provider_base_url.rstrip("/")


class FiveSimProvider(SMSProvider):
    name = "fivesim"

    def __init__(self) -> None:
        self._headers = {
            "Authorization": f"Bearer {settings.provider_api_key}",
            "Accept": "application/json",
        }

    async def get_countries(self) -> list[dict]:
        """
        Get all countries currently available from 5SIM.
        """
        url = f"{BASE_URL}/guest/countries"

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                url,
                headers={"Accept": "application/json"},
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"5SIM countries request failed: "
                f"{response.status_code} {response.text}"
            )

        data = response.json()

        countries = []

        for country_code, country_data in data.items():
            iso_data = country_data.get("iso") or {}
            prefix_data = country_data.get("prefix") or {}

            iso = next(iter(iso_data), None)
            prefix = next(iter(prefix_data), None)

            countries.append(
                {
                    "code": country_code,
                    "name": country_data.get(
                        "text_en",
                        country_code.replace("-", " ").title(),
                    ),
                    "iso": iso,
                    "prefix": prefix,
                }
            )

        countries.sort(key=lambda item: item["name"].lower())

        return countries

    async def get_services(
        self,
        country: str,
        operator: str = "any",
    ) -> list[dict]:
        """
        Get services/products available for a country.

        5SIM returns products such as:
        whatsapp
        facebook
        telegram
        google
        etc.

        Only products with available quantity are returned.
        """
        country = country.strip().lower()
        operator = operator.strip().lower()

        url = f"{BASE_URL}/guest/products/{country}/{operator}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                url,
                headers={"Accept": "application/json"},
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"5SIM services request failed: "
                f"{response.status_code} {response.text}"
            )

        data = response.json()

        services = []

        for service_name, service_data in data.items():
            quantity = int(service_data.get("Qty", 0) or 0)
            price = float(service_data.get("Price", 0) or 0)

            # Only show products that currently have numbers.
            if quantity <= 0:
                continue

            services.append(
                {
                    "service": service_name,
                    "category": service_data.get("Category"),
                    "available": quantity,
                    "cost_usd": price,
                }
            )

        services.sort(key=lambda item: item["service"].lower())

        return services

    async def list_offers(
        self,
        service: str,
        country: str,
    ) -> list[Offer]:
        """
        Every currently-stocked operator/pool for this service+country, each
        with its own price and success rate — this is what lets the buy
        screen show several options (Classic/Global/Select/etc in 5SIM's own
        dashboard language) instead of just the cheapest one. 5SIM's `rate`
        field is a 0-100 historical success percentage for that pool.
        """
        service = service.strip().lower()
        country = country.strip().lower()

        url = f"{BASE_URL}/guest/prices"
        params = {"country": country, "product": service}

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, params=params, headers={"Accept": "application/json"})

        if response.status_code != 200:
            raise LookupError(f"No numbers available for {service}/{country}: {response.text}")

        data = response.json()

        try:
            product_data = data[country][service]
        except (KeyError, TypeError):
            raise LookupError(f"No numbers available for {service}/{country}")

        offers = []
        for operator_name, operator_data in product_data.items():
            count = int(operator_data.get("count", 0) or 0)
            if count <= 0:
                continue
            try:
                cost = float(operator_data["cost"])
            except (KeyError, TypeError, ValueError):
                continue
            rate = operator_data.get("rate")
            offers.append(
                Offer(
                    operator=operator_name,
                    cost_usd=cost,
                    success_rate=float(rate) if rate is not None else None,
                    available=count,
                )
            )

        if not offers:
            raise LookupError(f"No numbers available for {service}/{country}")

        offers.sort(key=lambda o: o.cost_usd)
        return offers

    async def get_price_usd(
        self,
        service: str,
        country: str,
    ) -> float:
        """
        Get the cheapest currently available price
        for a service/country combination.
        """
        offers = await self.list_offers(service, country)
        return min(o.cost_usd for o in offers)

    async def reserve_number(
        self,
        service: str,
        country: str,
        operator: str = "any",
    ) -> ReservedNumber:
        """
        Purchase an activation number from 5SIM. `operator` is one of the
        pool ids returned by list_offers() (or "any" to let 5SIM pick).
        """
        service = service.strip().lower()
        country = country.strip().lower()
        operator = (operator or "any").strip().lower()

        url = (
            f"{BASE_URL}/user/buy/activation/"
            f"{country}/{operator}/{service}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers=self._headers,
            )

        if response.status_code != 200:
            try:
                error_data = response.json()
                error_message = (
                    error_data.get("message")
                    or error_data.get("error")
                    or response.text
                )
            except Exception:
                error_message = response.text

            raise LookupError(
                f"5SIM purchase failed: {error_message}"
            )

        data = response.json()

        return ReservedNumber(
            provider_order_id=str(data["id"]),
            phone_number=data["phone"],
            cost_usd=float(data["price"]),
        )

    async def check_sms(
        self,
        provider_order_id: str,
    ) -> Optional[str]:
        """
        Check whether an SMS verification code has arrived.
        """
        url = f"{BASE_URL}/user/check/{provider_order_id}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                url,
                headers=self._headers,
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"5SIM SMS check failed: "
                f"{response.status_code} {response.text}"
            )

        data = response.json()

        sms_list = data.get("sms") or []

        if sms_list:
            return sms_list[0].get("code")

        return None

    async def cancel_order(
        self,
        provider_order_id: str,
    ) -> None:
        """
        Cancel a 5SIM order and release the number.
        """
        url = f"{BASE_URL}/user/cancel/{provider_order_id}"

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                url,
                headers=self._headers,
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"5SIM cancel failed: "
                f"{response.status_code} {response.text}"
            )