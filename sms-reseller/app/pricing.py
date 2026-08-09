"""
Pricing / markup logic.

Flow: provider cost (USD) -> convert to NGN -> pick the matching price tier
      -> apply that tier's % markup -> apply that tier's flat fee
      -> enforce a global minimum price -> round to nearest 10 naira.

Tiers let cheap numbers carry a light markup while expensive ones carry a
bigger flat cushion (e.g. "+₦1000 on anything costing over ₦1000, +₦1500 on
anything over ₦3000") — a flat % alone under-charges on expensive numbers
relative to the extra risk/capital tied up in them.

Both the tier list and the two scalar knobs (usd_ngn_rate, min_price_ngn)
live in site_settings (DB) so they're editable from the admin panel without
a redeploy, falling back to .env defaults / a single catch-all tier if
nothing's been configured yet.
"""

import json
import math
from typing import Optional

from sqlmodel import Session, select

from app.config import settings
from app.models import SiteSetting

SCALAR_KEYS = ["usd_ngn_rate", "min_price_ngn"]
TIERS_KEY = "pricing_tiers"


def default_tiers() -> list[dict]:
    """Single catch-all tier built from .env — used until an admin sets up real tiers."""
    return [
        {
            "max_cost_ngn": None,
            "markup_percent": settings.markup_percent,
            "markup_flat_ngn": settings.markup_flat_ngn,
        }
    ]


def _normalize_tier(raw: dict) -> dict:
    max_cost = raw.get("max_cost_ngn")
    return {
        "max_cost_ngn": float(max_cost) if max_cost not in (None, "") else None,
        "markup_percent": float(raw.get("markup_percent") or 0),
        "markup_flat_ngn": float(raw.get("markup_flat_ngn") or 0),
    }


def get_pricing_tiers(session: Optional[Session] = None) -> list[dict]:
    if session is None:
        return default_tiers()
    row = session.get(SiteSetting, TIERS_KEY)
    if row is None or not row.value:
        return default_tiers()
    try:
        parsed = json.loads(row.value)
        if not isinstance(parsed, list) or not parsed:
            return default_tiers()
        return [_normalize_tier(t) for t in parsed]
    except (json.JSONDecodeError, TypeError, ValueError):
        return default_tiers()


def get_pricing_config(session: Optional[Session] = None) -> dict:
    """
    {"usd_ngn_rate": float, "min_price_ngn": float, "tiers": [tier, ...]}
    Pass a session to pick up live admin-panel overrides; omit it to just
    use .env defaults.
    """
    scalars = {
        "usd_ngn_rate": settings.usd_ngn_rate,
        "min_price_ngn": settings.min_price_ngn,
    }
    if session is None:
        return {**scalars, "tiers": default_tiers()}

    rows = session.exec(select(SiteSetting).where(SiteSetting.key.in_(SCALAR_KEYS))).all()
    for row in rows:
        try:
            scalars[row.key] = float(row.value)
        except (TypeError, ValueError):
            pass  # malformed override — fall back to the .env default for that key

    return {**scalars, "tiers": get_pricing_tiers(session)}


def save_pricing_config(session: Session, usd_ngn_rate: float, min_price_ngn: float, tiers: list[dict]) -> None:
    for key, value in [("usd_ngn_rate", usd_ngn_rate), ("min_price_ngn", min_price_ngn)]:
        row = session.get(SiteSetting, key)
        if row is None:
            row = SiteSetting(key=key, value=str(value))
        else:
            row.value = str(value)
        session.add(row)

    normalized = [_normalize_tier(t) for t in tiers] if tiers else default_tiers()
    tiers_row = session.get(SiteSetting, TIERS_KEY)
    if tiers_row is None:
        tiers_row = SiteSetting(key=TIERS_KEY, value=json.dumps(normalized))
    else:
        tiers_row.value = json.dumps(normalized)
    session.add(tiers_row)
    session.commit()


def _pick_tier(cost_ngn: float, tiers: list[dict]) -> dict:
    # Catch-all (max_cost_ngn=None) always sorts last; finite tiers ascending.
    ordered = sorted(tiers, key=lambda t: (t["max_cost_ngn"] is None, t["max_cost_ngn"] or 0))
    for tier in ordered:
        if tier["max_cost_ngn"] is None or cost_ngn <= tier["max_cost_ngn"]:
            return tier
    return ordered[-1]


def round_to_nearest(value: float, nearest: int = 10) -> float:
    return math.ceil(value / nearest) * nearest


def price_for_customer(cost_usd: float, session: Optional[Session] = None) -> float:
    """
    Given what the upstream provider charges us (in USD) for a number,
    return what we charge the customer (in NGN).
    """
    cfg = get_pricing_config(session)
    cost_ngn = cost_usd * cfg["usd_ngn_rate"]
    tier = _pick_tier(cost_ngn, cfg["tiers"])

    with_percent = cost_ngn * (1 + tier["markup_percent"] / 100)
    with_flat = with_percent + tier["markup_flat_ngn"]

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
