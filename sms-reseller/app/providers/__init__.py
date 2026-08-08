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
    adapter_cls = _ADAPTERS.get(settings.provider, MockProvider)
    return adapter_cls()
