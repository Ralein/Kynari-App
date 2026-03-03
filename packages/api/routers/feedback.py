"""Feedback routes — parent corrections for need predictions."""

import logging
from fastapi import APIRouter, HTTPException

from models.schemas import FeedbackCreate, FeedbackResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@router.post("/", response_model=FeedbackResponse)
async def submit_feedback(body: FeedbackCreate):
    """Submit a parent correction for a need prediction.

    When the AI predicts "hungry" but the parent knows
    the baby was "sleepy", this stores that correction.
    """
    from ml.feedback_store import feedback_store

    result = feedback_store.store_correction(
        event_id=body.event_id,
        child_id=body.child_id,
        original_label=body.original_label,
        corrected_label=body.corrected_label,
        parent_id="system",  # TODO: extract from auth context
    )
    return FeedbackResponse(**result)


@router.get("/{child_id}/stats")
async def get_feedback_stats(child_id: str):
    """Get feedback accuracy statistics for a child.

    Returns per-label accuracy, overall correction rate,
    and most common confusion pairs.
    """
    from ml.feedback_store import feedback_store
    return feedback_store.get_accuracy_stats(child_id)


@router.get("/{child_id}/recent")
async def get_recent_feedback(child_id: str, limit: int = 20):
    """Get recent feedback corrections for a child."""
    from ml.feedback_store import feedback_store

    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")

    return feedback_store.get_recent_corrections(child_id, limit=limit)
