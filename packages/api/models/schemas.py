from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Literal


# ─── Need Types (Primary System) ─────────────────────────────

NeedLabel = Literal["hungry", "diaper", "sleepy", "pain", "calm"]
Modality = Literal["voice", "face", "combined", "context_only"]

# Legacy emotion types (backward compat)
EmotionLabel = Literal["happy", "sad", "angry", "fearful", "neutral", "frustrated"]


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
        if age_years < 0 or age_years > 5:
            raise ValueError("Kynari is designed for babies ages 0–5")
        return v


class ChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: str
    name: str
    date_of_birth: date
    created_at: datetime
    avatar_url: str | None = None


# ─── Need Event Schemas ──────────────────────────────────────

class NeedEventCreate(BaseModel):
    timestamp: datetime
    need_label: NeedLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    modality: Modality
    secondary_need: NeedLabel | None = None
    audio_features: dict | None = None
    face_distress_score: float | None = Field(None, ge=0.0, le=1.0)
    all_needs: dict[str, float] | None = None

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


class NeedEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    session_id: str
    need_label: NeedLabel
    confidence: float
    modality: Modality
    secondary_need: str | None = None
    audio_features: dict | None = None
    face_distress_score: float | None = None
    all_needs: dict[str, float] | None = None
    timestamp: datetime
    created_at: datetime


# ─── Need Prediction Response (from ML pipeline) ────────────

class NeedPredictionResponse(BaseModel):
    success: bool
    modality: str | None = None
    need_label: str | None = None
    need_description: str | None = None
    confidence: float | None = None
    secondary_need: str | None = None
    all_needs: dict[str, float] | None = None
    audio_features: dict | None = None
    spectrogram_b64: str | None = None
    fusion_weights: dict[str, float] | None = None
    audio_analysis: dict | None = None
    face_analysis: dict | None = None
    context_used: dict | None = None
    frames_analyzed: int | None = None
    error: str | None = None
    message: str | None = None


# ─── Face Distress Response ──────────────────────────────────

class FaceDistressResponse(BaseModel):
    success: bool
    modality: str | None = None
    distress_score: float | None = None
    distress_intensity: str | None = None
    stress_features: dict[str, float] | None = None
    faces_detected: int | None = None
    # Need prediction (face-only ML)
    need_label: str | None = None
    need_description: str | None = None
    confidence: float | None = None
    secondary_need: str | None = None
    all_needs: dict[str, float] | None = None
    # Expression (FER model)
    expression: str | None = None
    expression_confidence: float | None = None
    error: str | None = None
    message: str | None = None


# ─── Feedback Schemas ────────────────────────────────────────

class FeedbackCreate(BaseModel):
    event_id: str
    child_id: str
    original_label: NeedLabel
    corrected_label: NeedLabel


class FeedbackResponse(BaseModel):
    success: bool
    feedback_id: str | None = None
    original_label: str | None = None
    corrected_label: str | None = None
    error: str | None = None
    message: str | None = None


# ─── Context Schemas ─────────────────────────────────────────

class ContextUpdate(BaseModel):
    last_feed_at: datetime | None = None
    last_diaper_at: datetime | None = None
    last_nap_at: datetime | None = None


class ContextResponse(BaseModel):
    child_id: str
    last_feed_at: datetime | None = None
    last_diaper_at: datetime | None = None
    last_nap_at: datetime | None = None
    updated_at: datetime | None = None


# ─── Save Result Request ────────────────────────────────────

class SaveNeedResultRequest(BaseModel):
    child_id: str
    need_label: NeedLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    modality: Modality
    secondary_need: NeedLabel | None = None
    audio_features: dict | None = None
    face_distress_score: float | None = Field(None, ge=0.0, le=1.0)
    all_needs: dict[str, float] | None = None
    raw_result: dict | None = None


class SaveResultResponse(BaseModel):
    success: bool
    event_id: str
    session_id: str


# ─── Batch Request/Response ──────────────────────────────────

class BatchNeedEventsRequest(BaseModel):
    child_id: str
    session_id: str
    events: list[NeedEventCreate] = Field(..., min_length=1, max_length=100)


class BatchEventsResponse(BaseModel):
    received: int
    session_id: str
    status: str = "ok"


# ─── Summary Schemas ─────────────────────────────────────────

class NeedDailySummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_id: UUID
    date: date
    dominant_need: NeedLabel
    need_distribution: dict[str, float]
    total_events: int
    baseline_deviation: float | None = None
    insight_text: str | None = None


class BaselineStatusResponse(BaseModel):
    calibration_complete: bool
    days_of_data: int
    days_remaining: int


# ─── Legacy Emotion Schemas (backward compat) ────────────────

class EmotionEventCreate(BaseModel):
    timestamp: datetime
    emotion_label: EmotionLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    modality: Literal["voice", "face", "combined"]

class EmotionEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    child_id: UUID
    session_id: UUID
    emotion_label: EmotionLabel
    confidence: float
    modality: str
    timestamp: datetime
    created_at: datetime
