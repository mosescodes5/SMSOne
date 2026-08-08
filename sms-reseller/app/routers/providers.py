from fastapi import APIRouter, HTTPException

from app.providers.fivesim import FiveSimProvider


router = APIRouter(
    prefix="/providers",
    tags=["providers"],
)


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