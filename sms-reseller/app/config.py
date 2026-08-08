from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./sms_reseller.db"

    # --- Supabase (auth + Postgres) ---
    # Auth is handled entirely by Supabase now — the frontend calls
    # supabase-js directly for signup/login. The backend's only job is to
    # verify the JWT Supabase issues on each request. Find these in the
    # Supabase dashboard: Project Settings -> API.
    supabase_url: str = ""
    supabase_jwt_secret: str = ""  # Settings -> API -> JWT Secret (HS256 projects)

    provider: str = "mock"  # fivesim | smsman | smsactivate | mock
    provider_api_key: str = ""
    provider_base_url: str = ""

    # Comma-separated emails that are always treated as admin, regardless of
    # the `is_admin` DB flag — this is how you bootstrap your very first
    # admin account (yourself) without needing an admin panel to already
    # exist. Once you're in, you can grant/revoke `is_admin` on other
    # accounts from the panel itself.
    admin_emails: str = ""

    usd_ngn_rate: float = 1600.0

    markup_percent: float = 45.0
    markup_flat_ngn: float = 50.0
    min_price_ngn: float = 150.0

    order_timeout_seconds: int = 600
    poll_interval_seconds: int = 5

    # --- Korapay (payment gateway) ---
    korapay_public_key: str = ""
    korapay_secret_key: str = ""
    korapay_redirect_url: str = "https://yourapp.example.com/wallet/topup/complete"


settings = Settings()
