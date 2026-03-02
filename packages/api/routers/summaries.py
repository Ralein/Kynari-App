"""Summaries and patterns router."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from models.schemas import DailySummaryResponse, BaselineStatusResponse
from database import get_supabase
from datetime import date, timedelta

router = APIRouter(prefix="/summaries", tags=["summaries"])


def _verify_child_ownership(child_id: str, user_id: str) -> None:
    db = get_supabase()
    result = (
        db.table("children")
        .select("id")
        .eq("id", child_id)
        .eq("parent_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Child not found or access denied")


@router.get("/{child_id}/today", response_model=DailySummaryResponse | None)
async def get_today_summary(child_id: str, user: dict = Depends(get_current_user)):
    """Get today's daily summary for a child."""
    _verify_child_ownership(child_id, user["user_id"])

    db = get_supabase()
    today = date.today().isoformat()
    result = (
        db.table("daily_summaries")
        .select("*")
        .eq("child_id", child_id)
        .eq("date", today)
        .single()
        .execute()
    )

    return result.data


@router.get("/{child_id}/week", response_model=list[DailySummaryResponse])
async def get_week_summaries(child_id: str, user: dict = Depends(get_current_user)):
    """Get the last 7 days of daily summaries."""
    _verify_child_ownership(child_id, user["user_id"])

    db = get_supabase()
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    result = (
        db.table("daily_summaries")
        .select("*")
        .eq("child_id", child_id)
        .gte("date", week_ago)
        .order("date")
        .execute()
    )

    return result.data or []


@router.get("/{child_id}/patterns")
async def get_patterns(
    child_id: str,
    days: int = 30,
    user: dict = Depends(get_current_user),
):
    """
    Get emotion frequency patterns over time.
    Placeholder — full implementation in Phase 2.
    """
    _verify_child_ownership(child_id, user["user_id"])

    return {
        "child_id": child_id,
        "days": days,
        "patterns": [],
        "message": "Pattern analysis will be available after 7 days of baseline data.",
    }


@router.get("/{child_id}/baseline-status", response_model=BaselineStatusResponse)
async def get_baseline_status(child_id: str, user: dict = Depends(get_current_user)):
    """Get baseline calibration status for a child."""
    _verify_child_ownership(child_id, user["user_id"])

    db = get_supabase()
    result = (
        db.table("child_baselines")
        .select("*")
        .eq("child_id", child_id)
        .execute()
    )

    baselines = result.data or []

    if not baselines:
        return BaselineStatusResponse(
            calibration_complete=False,
            days_of_data=0,
            days_remaining=7,
        )

    # Use the baseline with the most data
    best = max(baselines, key=lambda b: b.get("days_of_data", 0))
    days = best.get("days_of_data", 0)

    return BaselineStatusResponse(
        calibration_complete=best.get("calibration_complete", False),
        days_of_data=days,
        days_remaining=max(0, 7 - days),
    )
