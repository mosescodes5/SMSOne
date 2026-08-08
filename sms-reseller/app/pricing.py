"""
Pricing / markup logic.

Flow: provider cost (USD) -> convert to NGN -> apply % markup -> apply flat fee
      -> enforce a minimum price -> round to nearest 10 naira (clean pricing).

Keeping this in one place means you can change your margin strategy (e.g. per-service
markup, tiered volume discounts, promo pricing) without touching order/routing code.
"""

import math

from app.config import settings


def usd_to_ngn(amount_usd: float) -> float:
    return amount_usd * settings.usd_ngn_rate


def round_to_nearest(value: float, nearest: int = 10) -> float:
    return math.ceil(value / nearest) * nearest


def price_for_customer(cost_usd: float) -> float:
    """
    Given what the upstream provider charges us (in USD) for a number,
    return what we charge the customer (in NGN).
    """
    cost_ngn = usd_to_ngn(cost_usd)

    with_percent = cost_ngn * (1 + settings.markup_percent / 100)
    with_flat = with_percent + settings.markup_flat_ngn

    final_price = max(with_flat, settings.min_price_ngn)
    return round_to_nearest(final_price)


def margin_breakdown(cost_usd: float) -> dict:
    """Useful for an internal admin dashboard — shows where the margin comes from."""
    cost_ngn = usd_to_ngn(cost_usd)
    price_ngn = price_for_customer(cost_usd)
    margin_ngn = price_ngn - cost_ngn
    margin_pct = (margin_ngn / cost_ngn * 100) if cost_ngn else 0.0
    return {
        "cost_usd": round(cost_usd, 4),
        "cost_ngn": round(cost_ngn, 2),
        "price_ngn": price_ngn,
        "margin_ngn": round(margin_ngn, 2),
        "margin_pct": round(margin_pct, 1),
    }
