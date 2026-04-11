"""Pydantic models for Voice Lullaby Studio."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ─── Voice Models ────────────────────────────────────────────

class VoiceInfo(BaseModel):
    voice_id: str
    name: str
    gender: str
    style: str
    description: str


class VoicePreference(BaseModel):
    parent_id: str
    selected_voice: str
    label: str
    updated_at: Optional[datetime] = None


class VoicePreferenceUpdate(BaseModel):
    selected_voice: str
    label: str = "Default"


# ─── Lullaby Models ─────────────────────────────────────────

class LullabyInfo(BaseModel):
    id: str
    title: str
    lyrics: str
    mood: str
    origin: str
    duration_estimate: int  # seconds


class LullabyGenerateRequest(BaseModel):
    voice_id: str
    lullaby_id: str
    child_id: Optional[str] = None


class LullabyGenerateResponse(BaseModel):
    success: bool
    audio_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    message: str = ""


class SpeakRequest(BaseModel):
    voice_id: str
    text: str


class SpeakResponse(BaseModel):
    success: bool
    audio_url: Optional[str] = None
    message: str = ""
