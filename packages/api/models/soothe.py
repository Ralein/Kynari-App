"""Pydantic models for the Smart Soothe Engine."""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ─── Request Models ──────────────────────────────────────────

class SootheFeedbackRequest(BaseModel):
    child_id: str
    need: str
    technique_id: str
    outcome: Literal["success", "fail"]
    notes: Optional[str] = None
    duration_seconds: Optional[int] = None  # how long they tried


# ─── Response Models ─────────────────────────────────────────

class SootheTechnique(BaseModel):
    technique_id: str
    name: str
    description: str
    icon: str
    steps: list[str]
    timer_seconds: Optional[int] = None
    success_rate: Optional[float] = None     # None until ≥3 feedback events
    total_feedback: int = 0


class SoothePlanResponse(BaseModel):
    need: str
    confidence: float
    techniques: list[SootheTechnique]        # ranked, max 4
    personalised: bool                        # False until ≥5 feedback events for child


class SootheFeedbackResponse(BaseModel):
    success: bool
    feedback_id: Optional[str] = None
    message: str = "Feedback recorded"


class TechniqueStats(BaseModel):
    technique_id: str
    name: str
    need: str
    success_count: int
    fail_count: int
    total_count: int
    success_rate: Optional[float] = None
    avg_duration_seconds: Optional[float] = None
    last_used: Optional[datetime] = None


class SootheStatsResponse(BaseModel):
    child_id: str
    total_feedback: int
    techniques: list[TechniqueStats]
