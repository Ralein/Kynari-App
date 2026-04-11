"""Sleep Soundscape API router — preferences, session logging, profiles."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query

from middleware.auth import get_current_user
from models.soundscape import (
    SoundscapePreferencesUpdate,
    SoundscapePreferencesResponse,
    SoundscapeSessionEnd,
    SoundscapeSessionResponse,
    SoundscapeProfileInfo,
)
from services import soundscape_service
from database import fetch_one

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/soundscape", tags=["soundscape"])


def _verify_child_ownership(child_id: str, user_id: str) -> None:
    """Verify the child belongs to the authenticated user."""
    child = fetch_one(
        "SELECT id FROM children WHERE id = %s AND parent_id = %s",
        (child_id, user_id),
    )
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")


# ─── Endpoints ───────────────────────────────────────────────


@router.get("/profiles", response_model=list[SoundscapeProfileInfo])
async def list_profiles(user: dict = Depends(get_current_user)):
    """List all available soundscape profiles."""
    return soundscape_service.list_profiles()


@router.get("/preferences/{child_id}", response_model=SoundscapePreferencesResponse)
async def get_preferences(
    child_id: str,
    user: dict = Depends(get_current_user),
):
    """Get saved soundscape preferences for a child."""
    _verify_child_ownership(child_id, user["user_id"])

    prefs = soundscape_service.get_preferences(child_id)
    if not prefs:
        # Return defaults if no preferences saved yet
        return SoundscapePreferencesResponse(
            child_id=child_id,
            default_profile="deep_sleep",
            auto_adapt=True,
            nature_sound="ocean",
        )
    return prefs


@router.post("/preferences", response_model=SoundscapePreferencesResponse)
async def save_preferences(
    request: SoundscapePreferencesUpdate,
    user: dict = Depends(get_current_user),
):
    """Save or update soundscape preferences for a child."""
    _verify_child_ownership(request.child_id, user["user_id"])

    result = soundscape_service.save_preferences(
        child_id=request.child_id,
        default_profile=request.default_profile,
        auto_adapt=request.auto_adapt,
        nature_sound=request.nature_sound,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to save preferences")
    return result


@router.post("/session-end", response_model=SoundscapeSessionResponse)
async def log_session_end(
    request: SoundscapeSessionEnd,
    user: dict = Depends(get_current_user),
):
    """Log a completed soundscape session for sleep analytics."""
    _verify_child_ownership(request.child_id, user["user_id"])

    result = soundscape_service.log_session(
        child_id=request.child_id,
        started_at=request.started_at,
        duration_minutes=request.duration_minutes,
        avg_distress=request.avg_distress,
        profile_used=request.profile_used,
        auto_adapt_used=request.auto_adapt_used,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to log session")
    return result


@router.get("/sessions/{child_id}", response_model=list[SoundscapeSessionResponse])
async def get_sessions(
    child_id: str,
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """Get recent soundscape sessions for a child."""
    _verify_child_ownership(child_id, user["user_id"])
    return soundscape_service.get_sessions(child_id, limit)
