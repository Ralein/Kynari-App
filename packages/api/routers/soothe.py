"""Soothe Engine API router — personalised soothing technique plans."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query

from middleware.auth import get_current_user
from models.soothe import (
    SoothePlanResponse,
    SootheFeedbackRequest,
    SootheFeedbackResponse,
    SootheStatsResponse,
)
from services import soothe_engine
from database import fetch_one

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/soothe", tags=["soothe"])


def _verify_child_ownership(child_id: str, user_id: str) -> None:
    """Verify the child belongs to the authenticated user."""
    child = fetch_one(
        "SELECT id FROM children WHERE id = %s AND parent_id = %s",
        (child_id, user_id),
    )
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")


# ─── Endpoints ───────────────────────────────────────────────


@router.get("/plan", response_model=SoothePlanResponse)
async def get_soothe_plan(
    child_id: str = Query(..., description="Child UUID"),
    need: str = Query(..., description="Detected need (hungry/sleepy/diaper/pain/calm)"),
    confidence: float = Query(0.0, ge=0.0, le=1.0, description="Detection confidence"),
    user: dict = Depends(get_current_user),
):
    """Get a ranked soothe plan for a detected baby need.

    Returns up to 4 techniques, personalised by the child's feedback history
    and the current time of day.
    """
    _verify_child_ownership(child_id, user["user_id"])

    valid_needs = {"hungry", "sleepy", "diaper", "pain", "calm"}
    if need not in valid_needs:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid need '{need}'. Must be one of: {', '.join(sorted(valid_needs))}",
        )

    plan = soothe_engine.get_plan(child_id, need)
    plan["confidence"] = confidence

    return SoothePlanResponse(**plan)


@router.post("/feedback", response_model=SootheFeedbackResponse)
async def submit_feedback(
    request: SootheFeedbackRequest,
    user: dict = Depends(get_current_user),
):
    """Record parent feedback for a soothe technique.

    Outcomes: 'success' or 'fail'. This data personalises future plan rankings.
    """
    _verify_child_ownership(request.child_id, user["user_id"])

    result = soothe_engine.record_feedback(
        child_id=request.child_id,
        need=request.need,
        technique_id=request.technique_id,
        outcome=request.outcome,
        duration_seconds=request.duration_seconds,
        notes=request.notes,
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to record feedback")

    return SootheFeedbackResponse(
        success=True,
        feedback_id=result["feedback_id"],
        message="Thank you! This helps Kynari learn what works best for your baby.",
    )


@router.get("/techniques")
async def list_techniques(
    need: str | None = Query(None, description="Filter by need category"),
    user: dict = Depends(get_current_user),
):
    """List all soothe techniques, optionally filtered by need category."""
    techniques = soothe_engine.list_techniques(need)
    return techniques


@router.get("/stats/{child_id}", response_model=SootheStatsResponse)
async def get_stats(
    child_id: str,
    user: dict = Depends(get_current_user),
):
    """Get per-technique success rate statistics for a child."""
    _verify_child_ownership(child_id, user["user_id"])

    stats = soothe_engine.get_technique_stats(child_id)

    return SootheStatsResponse(
        child_id=child_id,
        total_feedback=sum(s.get("total_count", 0) for s in stats),
        techniques=stats,
    )
