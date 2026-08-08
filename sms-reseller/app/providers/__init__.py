from app.config import settings
from app.providers.base import SMSProvider
from app.providers.mock import MockProvider
from app.providers.fivesim import FiveSimProvider

_ADAPTERS = {
    "mock": MockProvider,
    "fivesim": FiveSimProvider,
    # "smsactivate": SmsActivateProvider,  # add adapters following the same pattern
    # "smsman": SmsManProvider,
}


def get_provider() -> SMSProvider:
    adapter_cls = _ADAPTERS.get(settings.provider, MockProvider)
    return adapter_cls()
