"""
Pricing / markup logic.

Flow: provider cost (USD) -> convert to NGN -> apply % markup -> apply flat fee
      -> enforce a minimum price -> round to nearest 10 naira (clean pricing).

The four knobs (usd_ngn_rate, markup_percent, markup_flat_ngn, min_price_ngn)
live in site_settings (DB) so they're editable from the admin panel without a
redeploy — falling back to the .env defaults in Settings if a row hasn't been
set yet (fresh installs, or a key nobody's touched from the panel).
"""

import math
from typing import Optional

from sqlmodel import Session, select

from app.config import settings
from app.models import SiteSetting

PRICING_KEYS = ["usd_ngn_rate", "markup_percent", "markup_flat_ngn", "min_price_ngn"]


def get_pricing_config(session: Optional[Session] = None) -> dict:
    """
    Current pricing knobs as floats. Pass a session to pick up live
    admin-panel overrides; omit it (or pass None) to just use the .env
    defaults — e.g. for contexts without a DB session handy.
    """
    defaults = {
        "usd_ngn_rate": settings.usd_ngn_rate,
        "markup_percent": settings.markup_percent,
        "markup_flat_ngn": settings.markup_flat_ngn,
        "min_price_ngn": settings.min_price_ngn,
    }
    if session is None:
        return defaults

    rows = session.exec(select(SiteSetting).where(SiteSetting.key.in_(PRICING_KEYS))).all()
    for row in rows:
        try:
            defaults[row.key] = float(row.value)
        except (TypeError, ValueError):
            pass  # malformed override — fall back to the .env default for that key
    return defaults


def usd_to_ngn(amount_usd: float, session: Optional[Session] = None) -> float:
    rate = get_pricing_config(session)["usd_ngn_rate"]
    return amount_usd * rate


def round_to_nearest(value: float, nearest: int = 10) -> float:
    return math.ceil(value / nearest) * nearest


def price_for_customer(cost_usd: float, session: Optional[Session] = None) -> float:
    """
    Given what the upstream provider charges us (in USD) for a number,
    return what we charge the customer (in NGN).
    """
    cfg = get_pricing_config(session)
    cost_ngn = cost_usd * cfg["usd_ngn_rate"]

    with_percent = cost_ngn * (1 + cfg["markup_percent"] / 100)
    with_flat = with_percent + cfg["markup_flat_ngn"]

    final_price = max(with_flat, cfg["min_price_ngn"])
    return round_to_nearest(final_price)


def margin_breakdown(cost_usd: float, session: Optional[Session] = None) -> dict:
    """Useful for an internal admin dashboard — shows where the margin comes from."""
    cfg = get_pricing_config(session)
    cost_ngn = cost_usd * cfg["usd_ngn_rate"]
    price_ngn = price_for_customer(cost_usd, session)
    margin_ngn = price_ngn - cost_ngn
    margin_pct = (margin_ngn / cost_ngn * 100) if cost_ngn else 0.0
    return {
        "cost_usd": round(cost_usd, 4),
        "cost_ngn": round(cost_ngn, 2),
        "price_ngn": price_ngn,
        "margin_ngn": round(margin_ngn, 2),
        "margin_pct": round(margin_pct, 1),
    }

