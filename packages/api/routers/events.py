"""Emotion events router — ingest and query emotion events."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from middleware.auth import get_current_user
from models.schemas import (
    BatchEventsRequest,
    BatchEventsResponse,
    EmotionEventResponse,
    HourlyGroup,
    DailySummaryResponse,
)
from database import fetch_one, fetch_all, execute_returning_all, get_pool
from services.baseline_engine import baseline_engine
from services.summary_generator import summary_generator
from collections import defaultdict
from datetime import date

router = APIRouter(prefix="/events", tags=["events"])


def _verify_child_ownership(child_id: str, user_id: str) -> None:
    """Verify the child belongs to the authenticated parent."""
    row = fetch_one(
        "SELECT id FROM children WHERE id = %s AND parent_id = %s",
        (child_id, user_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Child not found or access denied")


@router.post("/batch", response_model=BatchEventsResponse, status_code=201)
async def batch_create_events(
    body: BatchEventsRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Ingest a batch of emotion events from a monitoring session.
    Validates ownership, stores events, triggers background baseline recalculation.
    """
    _verify_child_ownership(body.child_id, user["user_id"])

    # Build multi-row INSERT
    if not body.events:
        return BatchEventsResponse(received=0, session_id=body.session_id)

    values = []
    params = []
    for i, event in enumerate(body.events):
        base = i * 6
        values.append(
            f"(%s, %s, %s, %s, %s, %s)"
        )
        params.extend([
            body.child_id,
            body.session_id,
            event.emotion_label,
            event.confidence,
            event.modality,
            event.timestamp.isoformat(),
        ])

    sql = f"""
        INSERT INTO emotion_events (child_id, session_id, emotion_label, confidence, modality, timestamp)
        VALUES {', '.join(values)}
        RETURNING *
    """

    pool = get_pool()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
        conn.commit()

    if not rows:
        raise HTTPException(status_code=500, detail="Failed to store events")

    # Phase 1: Trigger baseline recalculation in background
    background_tasks.add_task(
        baseline_engine.ingest_events, body.child_id, body.events
    )

    return BatchEventsResponse(
        received=len(rows),
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

    if session_id:
        rows = fetch_all(
            """
            SELECT * FROM emotion_events
            WHERE child_id = %s
              AND timestamp >= %s
              AND timestamp < %s
              AND session_id = %s
            ORDER BY timestamp
            """,
            (child_id, f"{date}T00:00:00Z", f"{date}T23:59:59Z", session_id),
        )
    else:
        rows = fetch_all(
            """
            SELECT * FROM emotion_events
            WHERE child_id = %s
              AND timestamp >= %s
              AND timestamp < %s
            ORDER BY timestamp
            """,
            (child_id, f"{date}T00:00:00Z", f"{date}T23:59:59Z"),
        )

    return rows


@router.get("/{child_id}/timeline", response_model=list[HourlyGroup])
async def get_timeline(
    child_id: str,
    date: str,
    user: dict = Depends(get_current_user),
):
    """Get events grouped by hour for the hourly chart."""
    _verify_child_ownership(child_id, user["user_id"])

    events = fetch_all(
        """
        SELECT * FROM emotion_events
        WHERE child_id = %s
          AND timestamp >= %s
          AND timestamp < %s
        ORDER BY timestamp
        """,
        (child_id, f"{date}T00:00:00Z", f"{date}T23:59:59Z"),
    )

    # Group by hour
    hourly: dict[int, list] = defaultdict(list)
    for event in events:
        ts = str(event["timestamp"])
        hour = int(ts[11:13])
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


@router.post("/{child_id}/generate-summary", response_model=DailySummaryResponse | None)
async def generate_summary(
    child_id: str,
    target_date: str | None = None,
    user: dict = Depends(get_current_user),
):
    """
    On-demand summary generation for a specific date (defaults to today).
    Useful for manual triggers and debugging.
    """
    _verify_child_ownership(child_id, user["user_id"])

    if target_date is None:
        target_date = date.today().isoformat()

    result = await summary_generator.generate_daily(child_id, target_date)

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No events found for {target_date}",
        )

    return result
