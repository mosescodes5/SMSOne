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
    # ENVIRONMENT
    # ---------------------------------------------------------

    # Set debug=true only in local/.env for dev — this gates things that must
    # never be reachable in production, like the free-money dev topup route.
    # Leave it unset (defaults to False) in your production environment
    # variables (Vercel/Railway/wherever you deploy) — don't just trust the
    # default; explicitly confirm it's false/absent in prod env vars too.
    debug: bool = False


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

    # Comma-separated fallback provider names, tried in order whenever the
    # primary `provider` is out of stock for a given service+country (or its
    # API errors outright). e.g. "smsman" — falls through to SMS-Man if 5SIM
    # has nothing.
    provider_fallback: str = ""

    # SMS-Man reads its own key here (not provider_api_key, which is scoped
    # to whichever provider is primary) — set this whenever "smsman" is
    # used, whether as the primary provider or a fallback.
    smsman_api_key: str = ""


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


    # ---------------------------------------------------------
    # EMAIL (Brevo)
    # ---------------------------------------------------------

    # For account verification/password-reset emails, the simplest route is
    # actually a Supabase dashboard setting, not code: Project Settings ->
    # Auth -> SMTP Settings -> point it at Brevo's SMTP relay
    # (smtp-relay.brevo.com, port 587, login = your Brevo account email,
    # password = an SMTP key from Brevo -> Settings -> SMTP & API). That
    # replaces Supabase's rate-limited default mailer with Brevo for the
    # emails Supabase itself sends (signup confirmation, password reset) —
    # no backend code needed for that part.
    #
    # The settings below are for everything Supabase *doesn't* send: order
    # receipts, wallet top-up confirmations, low-balance nudges, etc. — see
    # app/email.py.
    brevo_api_key: str = ""

    brevo_sender_email: str = "no-reply@example.com"

    brevo_sender_name: str = "SMSOne"


settings = Settings()