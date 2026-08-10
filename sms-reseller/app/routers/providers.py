from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.pricing import price_for_customer
from app.providers import get_fallback_chain
from app.providers.fivesim import FiveSimProvider
from app.schemas import OfferRead


router = APIRouter(
    prefix="/providers",
    tags=["providers"],
)


# Country/service catalog browsing (for populating the buy screen's
# dropdowns) stays 5SIM-specific — that's just "what can I browse", not "is
# this in stock right now". Availability itself (get_offers below) does use
# the full fallback chain, since that's the part that actually needs to
# reflect real stock across every configured provider.
provider = FiveSimProvider()


@router.get("/countries")
async def get_countries():
    """
    Return countries currently available from 5SIM.
    """
    try:
        countries = await provider.get_countries()
        return {
            "countries": countries,
            "count": len(countries),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to load countries from 5SIM: {str(exc)}",
        )


@router.get("/services")
async def get_services(
    country: str,
    operator: str = "any",
):
    """
    Return services/products currently available
    for the selected country.
    """
    if not country.strip():
        raise HTTPException(
            status_code=400,
            detail="Country is required",
        )

    try:
        services = await provider.get_services(
            country=country,
            operator=operator,
        )

        return {
            "country": country.lower(),
            "operator": operator.lower(),
            "services": services,
            "count": len(services),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to load services from 5SIM: {str(exc)}",
        )


@router.get("/offers", response_model=list[OfferRead])
async def get_offers(
    service: str,
    country: str,
    session: Session = Depends(get_session),
):
    """
    Every currently-stocked pool for this service+country, priced for the
    customer — this is what the buy screen renders as multiple selectable
    cards (price + success rate) instead of a single "buy" button.

    Tries the primary provider first, then each configured fallback in
    order (PROVIDER_FALLBACK), returning the first one that actually has
    stock rather than merging catalogs across providers — keeps the buy
    screen simple (one coherent list) and matches what buy_number itself
    does when reserving.
    """
    if not service.strip() or not country.strip():
        raise HTTPException(status_code=400, detail="Service and country are required")

    last_error = None
    for candidate in get_fallback_chain():
        try:
            offers = await candidate.list_offers(service=service, country=country)
            if offers:
                return [
                    OfferRead(
                        operator=o.operator,
                        price_ngn=price_for_customer(o.cost_usd, session),
                        success_rate=o.success_rate,
                        available=o.available,
                    )
                    for o in offers
                ]
        except LookupError as exc:
            last_error = exc
            continue
        except Exception as exc:
            last_error = exc
            continue

    if isinstance(last_error, LookupError):
        raise HTTPException(status_code=404, detail=str(last_error))
    raise HTTPException(status_code=502, detail=f"Unable to load offers: {str(last_error)}")