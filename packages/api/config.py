from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ─── App ──────────────────────────────────────────────
    app_name: str = "Kynari API"
    app_version: str = "0.1.0"
    debug: bool = False

    # ─── Database (Neon Postgres) ─────────────────────────
    database_url: str = ""

    # ─── Auth ─────────────────────────────────────────────
    jwt_secret: str = ""
    clerk_publishable_key: str = ""

    # ─── CORS ─────────────────────────────────────────────
    api_cors_origins: str = "http://localhost:3000,http://localhost:8081"

    # ─── Stripe ───────────────────────────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_monthly: str = ""
    stripe_price_annual: str = ""

    # ─── AI Reports ───────────────────────────────────────
    anthropic_api_key: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]

    model_config = {
        "env_file": "../../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
