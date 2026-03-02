from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Literal


# ─── Emotion Types ───────────────────────────────────────────

EmotionLabel = Literal["happy", "sad", "angry", "fearful", "neutral", "frustrated"]
Modality = Literal["voice", "face", "combined"]


# ─── Child Schemas ───────────────────────────────────────────

class ChildCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z\s\-'\.]+$")
    date_of_birth: date
    avatar_url: str | None = None

    @field_validator("date_of_birth")
    @classmethod
    def validate_age(cls, v: date) -> date:
        from datetime import date as d
        today = d.today()
        age_years = (today - v).days / 365.25
        if age_years < 1 or age_years > 5:
            raise ValueError("Kynari is designed for toddlers ages 1–5")
        return v


class ChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    name: str
    date_of_birth: date
    created_at: datetime
    avatar_url: str | None = None


# ─── Emotion Event Schemas ───────────────────────────────────

class EmotionEventCreate(BaseModel):
    timestamp: datetime
    emotion_label: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    modality: Modality

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: datetime) -> datetime:
        from datetime import datetime as dt, timedelta, timezone
        now = dt.now(timezone.utc)
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v > now + timedelta(minutes=5):
            raise ValueError("Timestamp cannot be in the future")
        if v < now - timedelta(hours=24):
            raise ValueError("Timestamp cannot be older than 24 hours")
        return v


class EmotionEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    session_id: UUID
    emotion_label: EmotionLabel
    confidence: float
    modality: Modality
    timestamp: datetime
    created_at: datetime


# ─── Batch Request/Response ──────────────────────────────────

class BatchEventsRequest(BaseModel):
    child_id: str
    session_id: str
    events: list[EmotionEventCreate] = Field(..., min_length=1, max_length=100)


class BatchEventsResponse(BaseModel):
    received: int
    session_id: str
    status: str = "ok"


# ─── Summary Schemas ─────────────────────────────────────────

class DailySummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    date: date
    dominant_emotion: EmotionLabel
    emotion_distribution: dict[str, float]
    total_events: int
    baseline_deviation: float | None = None
    insight_text: str | None = None


class BaselineStatusResponse(BaseModel):
    calibration_complete: bool
    days_of_data: int
    days_remaining: int


# ─── Hourly Timeline ────────────────────────────────────────

class HourlyGroup(BaseModel):
    hour: int
    events: list[EmotionEventResponse]
    dominant_emotion: EmotionLabel
