"""Sleep Soundscape service — preferences and session management.

The actual audio mixing happens client-side via Web Audio API.
This service only stores user preferences and logs session data
for sleep analytics.
"""

import logging
from datetime import datetime, timezone

from database import fetch_one, fetch_all, execute_returning, execute

logger = logging.getLogger(__name__)


# ─── Preset Profiles ─────────────────────────────────────────

PROFILES = [
    {
        "id": "deep_sleep",
        "name": "Deep Sleep",
        "description": "Maximum masking for REM sleep phases. Ocean waves with strong pink noise.",
        "pink_noise": 0.7,
        "nature": 0.4,
        "piano": 0.2,
        "shush": 0.0,
        "icon": "🌙",
    },
    {
        "id": "light_fuss",
        "name": "Light Fuss",
        "description": "Gentle intervention with rain sounds and soft piano. Shush auto-activates if needed.",
        "pink_noise": 0.5,
        "nature": 0.3,
        "piano": 0.3,
        "shush": 0.0,  # auto-activates via adapt
        "icon": "🌧️",
    },
    {
        "id": "heavy_fuss",
        "name": "Heavy Fuss",
        "description": "Maximum masking mode — strong noise, no music, auto-shush enabled.",
        "pink_noise": 0.85,
        "nature": 0.0,
        "piano": 0.0,
        "shush": 0.0,  # auto-activates via adapt
        "icon": "💨",
    },
    {
        "id": "nap_time",
        "name": "Nap Time",
        "description": "Daytime nap profile. Forest ambience with light pink noise.",
        "pink_noise": 0.6,
        "nature": 0.5,
        "piano": 0.15,
        "shush": 0.0,
        "icon": "🌿",
    },
    {
        "id": "white_room",
        "name": "White Room",
        "description": "Pure pink noise only. No nature, no music. Maximum simplicity.",
        "pink_noise": 1.0,
        "nature": 0.0,
        "piano": 0.0,
        "shush": 0.0,
        "icon": "⬜",
    },
]


def list_profiles() -> list[dict]:
    """Return all available soundscape profiles."""
    return PROFILES


def get_preferences(child_id: str) -> dict | None:
    """Get saved soundscape preferences for a child."""
    return fetch_one(
        """
        SELECT child_id::text, default_profile, auto_adapt,
               nature_sound, updated_at
        FROM soundscape_preferences
        WHERE child_id = %s
        """,
        (child_id,),
    )


def save_preferences(
    child_id: str,
    default_profile: str,
    auto_adapt: bool,
    nature_sound: str,
) -> dict | None:
    """Save or update soundscape preferences (upsert)."""
    return execute_returning(
        """
        INSERT INTO soundscape_preferences
            (child_id, default_profile, auto_adapt, nature_sound, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (child_id) DO UPDATE SET
            default_profile = EXCLUDED.default_profile,
            auto_adapt = EXCLUDED.auto_adapt,
            nature_sound = EXCLUDED.nature_sound,
            updated_at = EXCLUDED.updated_at
        RETURNING child_id::text, default_profile, auto_adapt, nature_sound, updated_at
        """,
        (child_id, default_profile, auto_adapt, nature_sound, datetime.now(timezone.utc)),
    )


def log_session(
    child_id: str,
    started_at: datetime,
    duration_minutes: int,
    avg_distress: float,
    profile_used: str,
    auto_adapt_used: bool,
) -> dict | None:
    """Log a completed soundscape session for sleep analytics."""
    ended_at = datetime.now(timezone.utc)
    return execute_returning(
        """
        INSERT INTO soundscape_sessions
            (child_id, started_at, ended_at, duration_minutes,
             avg_distress, profile_used, auto_adapt_used)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id::text, child_id::text, started_at, ended_at,
                  duration_minutes, avg_distress, profile_used, auto_adapt_used
        """,
        (child_id, started_at, ended_at, duration_minutes,
         avg_distress, profile_used, auto_adapt_used),
    )


def get_sessions(child_id: str, limit: int = 20) -> list[dict]:
    """Get recent soundscape sessions for a child."""
    return fetch_all(
        """
        SELECT id::text, child_id::text, started_at, ended_at,
               duration_minutes, avg_distress, profile_used, auto_adapt_used
        FROM soundscape_sessions
        WHERE child_id = %s
        ORDER BY started_at DESC
        LIMIT %s
        """,
        (child_id, limit),
    )
