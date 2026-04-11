"""Pydantic models for Memory Garden."""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class MilestoneCreate(BaseModel):
    child_id: str
    type: str = "custom"  # first_smile | first_laugh | first_word | first_step | custom
    title: str
    description: Optional[str] = None


class MilestoneResponse(BaseModel):
    id: str
    child_id: str
    type: str
    title: str
    description: Optional[str] = None
    caption: Optional[str] = None
    detected_at: Optional[datetime] = None
    source: str = "manual"


class WeeklyNarrativeResponse(BaseModel):
    id: str
    child_id: str
    week_start: date
    week_end: date
    narrative: str
    analysis_count: int
    soothe_count: int
    created_at: Optional[datetime] = None


class MemoryGardenResponse(BaseModel):
    child_id: str
    milestones: list[MilestoneResponse]
    narratives: list[WeeklyNarrativeResponse]
    total_milestones: int
    total_narratives: int
