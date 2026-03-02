"""Summaries and patterns router."""

from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from models.schemas import DailySummaryResponse, BaselineStatusResponse
from database import get_supabase
from services.summary_generator import summary_generator
from datetime import date, timedelta

router = APIRouter(prefix="/summaries", tags=["summaries"])

EMOTION_LABELS = ["happy", "sad", "angry", "fearful", "neutral", "frustrated"]


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


@router.get("/{child_id}/week/narrative")
async def get_weekly_narrative(
    child_id: str,
    week_start: str | None = None,
    user: dict = Depends(get_current_user),
):
    """
    Get a weekly narrative summary with trend analysis.
    Defaults to the current week (Monday start).
    """
    _verify_child_ownership(child_id, user["user_id"])

    if week_start is None:
        # Default to Monday of current week
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        week_start = monday.isoformat()

    result = await summary_generator.generate_weekly(child_id, week_start)
    return result


@router.get("/{child_id}/patterns")
async def get_patterns(
    child_id: str,
    days: int = 30,
    user: dict = Depends(get_current_user),
):
    """
    Get emotion frequency patterns over time.
    Returns per-emotion daily frequency for the last N days.
    """
    _verify_child_ownership(child_id, user["user_id"])

    db = get_supabase()
    start_date = (date.today() - timedelta(days=days)).isoformat()

    # Fetch daily summaries for the period
    result = (
        db.table("daily_summaries")
        .select("date, dominant_emotion, emotion_distribution, total_events")
        .eq("child_id", child_id)
        .gte("date", start_date)
        .order("date")
        .execute()
    )

    summaries = result.data or []

    if not summaries:
        return {
            "child_id": child_id,
            "days": days,
            "days_with_data": 0,
            "patterns": [],
            "emotion_trends": {},
            "message": "No data available for this period. Start recording to build patterns.",
        }

    # Build per-emotion time series
    emotion_trends: dict[str, list[dict]] = {e: [] for e in EMOTION_LABELS}

    for summary in summaries:
        dist = summary.get("emotion_distribution", {})
        for emotion in EMOTION_LABELS:
            emotion_trends[emotion].append({
                "date": summary["date"],
                "percentage": dist.get(emotion, 0),
            })

    # Detect overall dominant pattern
    dominant_counts: dict[str, int] = {}
    for summary in summaries:
        dom = summary["dominant_emotion"]
        dominant_counts[dom] = dominant_counts.get(dom, 0) + 1

    return {
        "child_id": child_id,
        "days": days,
        "days_with_data": len(summaries),
        "dominant_distribution": dominant_counts,
        "emotion_trends": emotion_trends,
        "patterns": summaries,
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


# ─── AI Weekly Report ───────────────────────────────────────


@router.get("/{child_id}/ai-report")
async def get_ai_weekly_report(
    child_id: str,
    week_start: str | None = None,
    user: dict = Depends(get_current_user),
):
    """Get an AI-generated weekly narrative report.

    Uses Claude to create a warm, parent-friendly summary of the
    child's emotional patterns for the week. Falls back to a
    template-based summary if the Anthropic API key is not set.
    """
    _verify_child_ownership(child_id, user["user_id"])

    if week_start is None:
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        ws = monday
    else:
        ws = date.fromisoformat(week_start)

    from services.ai_report import ai_report

    # Check if report already exists
    existing = await ai_report.get_weekly_report(child_id, ws)
    if existing:
        return {
            "narrative": existing["narrative"],
            "week_start": ws.isoformat(),
            "generated_at": existing.get("created_at"),
            "cached": True,
        }

    # Generate new report
    narrative = await ai_report.generate_weekly_narrative(child_id, ws)
    return {
        "narrative": narrative,
        "week_start": ws.isoformat(),
        "generated_at": date.today().isoformat(),
        "cached": False,
    }

