"""Pydantic models for the Sleep Soundscape feature."""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


NatureSound = Literal["ocean", "rain", "forest", "none"]
SoundscapeProfile = Literal["deep_sleep", "light_fuss", "heavy_fuss", "nap_time", "white_room"]


# ─── Request Models ──────────────────────────────────────────

class SoundscapePreferencesUpdate(BaseModel):
    child_id: str
    default_profile: SoundscapeProfile = "deep_sleep"
    auto_adapt: bool = True
    nature_sound: NatureSound = "ocean"


class SoundscapeSessionEnd(BaseModel):
    child_id: str
    started_at: datetime
    duration_minutes: int
    avg_distress: float
    profile_used: SoundscapeProfile
    auto_adapt_used: bool = True


# ─── Response Models ─────────────────────────────────────────

class SoundscapePreferencesResponse(BaseModel):
    child_id: str
    default_profile: str
    auto_adapt: bool
    nature_sound: str
    updated_at: Optional[datetime] = None


class SoundscapeSessionResponse(BaseModel):
    id: str
    child_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    avg_distress: Optional[float] = None
    profile_used: Optional[str] = None
    auto_adapt_used: Optional[bool] = None


class SoundscapeProfileInfo(BaseModel):
    id: str
    name: str
    description: str
    pink_noise: float
    nature: float
    piano: float
    shush: float
    icon: str
