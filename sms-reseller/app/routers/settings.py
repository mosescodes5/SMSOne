from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import SiteSetting
from app.schemas import SiteSettingsRead

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULTS = {
    "whatsapp_group_url": "https://chat.whatsapp.com/LamcXmaQlk7AOfGBFIoLuq",
    "telegram_url": "https://t.me/swiftverifyng",
    "support_ticket_url": "https://t.me/SwiftVerifyNGcc",
    "support_email": "",
    "support_phone": "",
    "announcement": "",
}


@router.get("", response_model=SiteSettingsRead)
def get_public_settings(session: Session = Depends(get_session)):
    """No auth required — these are the links/contacts shown in the app nav."""
    rows = session.exec(select(SiteSetting)).all()
    values = {**DEFAULTS, **{r.key: r.value for r in rows}}
    return SiteSettingsRead(**values)
