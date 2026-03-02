"""Emotion events router — ingest and query emotion events."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from middleware.auth import get_current_user
from models.schemas import (
    BatchEventsRequest,
    BatchEventsResponse,
    EmotionEventResponse,
    HourlyGroup,
)
from database import get_supabase
from collections import defaultdict

router = APIRouter(prefix="/events", tags=["events"])


def _verify_child_ownership(child_id: str, user_id: str) -> None:
    """Verify the child belongs to the authenticated parent."""
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


@router.post("/batch", response_model=BatchEventsResponse, status_code=201)
async def batch_create_events(
    body: BatchEventsRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Ingest a batch of emotion events from a monitoring session.
    Validates ownership, stores events, triggers background summary generation.
    """
    _verify_child_ownership(body.child_id, user["user_id"])

    db = get_supabase()

    # Prepare rows for batch insert
    rows = []
    for event in body.events:
        rows.append(
            {
                "child_id": body.child_id,
                "session_id": body.session_id,
                "emotion_label": event.emotion_label,
                "confidence": event.confidence,
                "modality": event.modality,
                "timestamp": event.timestamp.isoformat(),
            }
        )

    result = db.table("emotion_events").insert(rows).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to store events")

    # TODO Phase 1: Trigger baseline recalculation in background
    # background_tasks.add_task(baseline_engine.ingest_events, body.child_id, body.events)
    # TODO Phase 2: Trigger daily summary generation
    # background_tasks.add_task(summary_generator.generate, body.child_id)

    return BatchEventsResponse(
        received=len(result.data),
        session_id=body.session_id,
    )


@router.get("/{child_id}", response_model=list[EmotionEventResponse])
async def get_events_by_date(
    child_id: str,
    date: str,
    session_id: str | None = None,
    user: dict = Depends(get_current_user),
):
    """Get emotion events for a child on a specific date."""
    _verify_child_ownership(child_id, user["user_id"])

    db = get_supabase()
    query = (
        db.table("emotion_events")
        .select("*")
        .eq("child_id", child_id)
        .gte("timestamp", f"{date}T00:00:00Z")
        .lt("timestamp", f"{date}T23:59:59Z")
        .order("timestamp")
    )

    if session_id:
        query = query.eq("session_id", session_id)

    result = query.execute()
    return result.data or []


@router.get("/{child_id}/timeline", response_model=list[HourlyGroup])
async def get_timeline(
    child_id: str,
    date: str,
    user: dict = Depends(get_current_user),
):
    """Get events grouped by hour for the hourly chart."""
    _verify_child_ownership(child_id, user["user_id"])

    db = get_supabase()
    result = (
        db.table("emotion_events")
        .select("*")
        .eq("child_id", child_id)
        .gte("timestamp", f"{date}T00:00:00Z")
        .lt("timestamp", f"{date}T23:59:59Z")
        .order("timestamp")
        .execute()
    )

    events = result.data or []

    # Group by hour
    hourly: dict[int, list] = defaultdict(list)
    for event in events:
        hour = int(event["timestamp"][11:13])
        hourly[hour].append(event)

    # Build response
    groups = []
    for hour in sorted(hourly.keys()):
        hour_events = hourly[hour]
        # Find dominant emotion for this hour
        emotion_counts: dict[str, int] = defaultdict(int)
        for e in hour_events:
            emotion_counts[e["emotion_label"]] += 1
        dominant = max(emotion_counts, key=emotion_counts.get)  # type: ignore

        groups.append(
            HourlyGroup(
                hour=hour,
                events=hour_events,
                dominant_emotion=dominant,
            )
        )

    return groups
