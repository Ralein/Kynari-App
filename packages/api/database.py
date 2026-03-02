import logging
from supabase import create_client, Client
from config import get_settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase() -> Client:
    """Get or create a Supabase client instance (service role for backend)."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError(
                "Supabase credentials not configured. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
            )
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client


def try_connect_supabase() -> bool:
    """Attempt to connect to Supabase. Returns False if credentials missing."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.warning(
            "⚠️  Supabase credentials not configured — API running in offline mode. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
        )
        return False
    try:
        get_supabase()
        logger.info("✅ Supabase connected")
        return True
    except Exception as e:
        logger.warning(f"⚠️  Supabase connection failed: {e}")
        return False


def get_supabase_anon() -> Client:
    """Get a Supabase client with anon key (for auth verification)."""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )
