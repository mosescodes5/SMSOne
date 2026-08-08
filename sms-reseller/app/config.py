from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # ---------------------------------------------------------
    # DATABASE
    # ---------------------------------------------------------

    database_url: str = "sqlite:///./sms_reseller.db"


    # ---------------------------------------------------------
    # SUPABASE
    # ---------------------------------------------------------

    supabase_url: str = ""

    supabase_jwt_secret: str = ""


    # ---------------------------------------------------------
    # SMS PROVIDER
    # ---------------------------------------------------------

    provider: str = "fivesim"

    provider_api_key: str = ""

    provider_base_url: str = "https://5sim.net/v1"


    # ---------------------------------------------------------
    # ADMIN
    # ---------------------------------------------------------

    # Comma-separated emails that should always be treated as admins.
    #
    # Example:
    #
    # admin_emails=you@example.com
    #
    admin_emails: str = ""


    # ---------------------------------------------------------
    # PRICING
    # ---------------------------------------------------------

    usd_ngn_rate: float = 1600.0

    markup_percent: float = 45.0

    markup_flat_ngn: float = 50.0

    min_price_ngn: float = 150.0


    # ---------------------------------------------------------
    # ORDERS
    # ---------------------------------------------------------

    order_timeout_seconds: int = 600

    poll_interval_seconds: int = 5


    # ---------------------------------------------------------
    # KORAPAY
    # ---------------------------------------------------------

    korapay_public_key: str = ""

    korapay_secret_key: str = ""

    korapay_redirect_url: str = (
        "https://yourapp.example.com/wallet/topup/complete"
    )


settings = Settings()