"""Pydantic models for the Care Playbook."""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


# ─── Request Models ──────────────────────────────────────────

class PlaybookFeedbackRequest(BaseModel):
    child_id: str
    need: str
    technique_id: str
    outcome: Literal["success", "fail"]
    notes: Optional[str] = None
    duration_seconds: Optional[int] = None  # how long they tried


# ─── Response Models ─────────────────────────────────────────

class PlaybookTechnique(BaseModel):
    technique_id: str
    name: str
    description: str
    icon: str
    steps: list[str]
    timer_seconds: Optional[int] = None
    success_rate: Optional[float] = None     # None until ≥3 feedback events
    total_feedback: int = 0


class PlaybookPlanResponse(BaseModel):
    need: str
    confidence: float
    techniques: list[PlaybookTechnique]        # ranked, max 4
    personalised: bool                        # False until ≥5 feedback events for child


class PlaybookFeedbackResponse(BaseModel):
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


class PlaybookStatsResponse(BaseModel):
    child_id: str
    total_feedback: int
    techniques: list[TechniqueStats]
