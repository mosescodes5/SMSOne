from app.config import settings
from app.providers.base import SMSProvider
from app.providers.mock import MockProvider
from app.providers.fivesim import FiveSimProvider
from app.providers.smsman import SmsManProvider

_ADAPTERS = {
    "mock": MockProvider,
    "fivesim": FiveSimProvider,
    "smsman": SmsManProvider,
    # "smsactivate": SmsActivateProvider,  # add more adapters following the same pattern
}


def get_provider() -> SMSProvider:
    """The primary configured provider (settings.provider)."""
    adapter_cls = _ADAPTERS.get(settings.provider, MockProvider)
    return adapter_cls()


def get_provider_by_name(name: str) -> SMSProvider:
    """
    Reconstruct a specific provider by name — used when handling an
    *existing* order (checking SMS status, cancelling), where the order was
    fulfilled by whichever provider actually had stock at purchase time
    (order.provider_name), not necessarily today's primary provider. Using
    get_provider() there instead would silently query the wrong upstream
    once fallback or a provider switch is in play.
    """
    adapter_cls = _ADAPTERS.get(name, MockProvider)
    return adapter_cls()


def get_fallback_chain() -> list[SMSProvider]:
    """
    Primary provider first, then each name in settings.provider_fallback in
    order, skipping duplicates (e.g. if the primary is accidentally also
    listed as a fallback) and any name that doesn't match a real adapter.
    """
    names = [settings.provider] + [
        n.strip() for n in settings.provider_fallback.split(",") if n.strip()
    ]
    seen = set()
    chain = []
    for name in names:
        if name in seen or name not in _ADAPTERS:
            continue
        seen.add(name)
        chain.append(_ADAPTERS[name]())
    return chain or [MockProvider()]
