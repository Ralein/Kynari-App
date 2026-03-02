"""Pro tier guard — FastAPI dependency to restrict endpoints to Pro users."""

from fastapi import Depends, HTTPException
from middleware.auth import get_current_user
from database import fetch_one


async def require_pro_tier(user: dict = Depends(get_current_user)) -> dict:
    """Require the authenticated user to have an active Pro subscription.

    Returns the user dict if Pro, raises 403 otherwise.
    """
    prefs = fetch_one(
        "SELECT tier, tier_expires_at FROM user_preferences WHERE user_id = %s",
        (user["user_id"],),
    )

    if not prefs or prefs.get("tier") != "pro":
        raise HTTPException(
            status_code=403,
            detail={
                "error": "pro_required",
                "message": "This feature requires Kynari Pro.",
                "upgrade_url": "/upgrade",
            },
        )

    # Check expiration
    if prefs.get("tier_expires_at"):
        from datetime import datetime, timezone

        expires = datetime.fromisoformat(str(prefs["tier_expires_at"]))
        if expires < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "pro_expired",
                    "message": "Your Pro subscription has expired.",
                    "upgrade_url": "/upgrade",
                },
            )

    return user
