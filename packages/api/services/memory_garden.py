"""Memory Garden service — milestones and weekly narratives.

Milestone detection is manual for now (parent adds them).
Auto-detection and weekly narrative generation can be added
via background cron jobs when needed.
"""

import logging
from database import fetch_one, fetch_all, execute_returning, execute

logger = logging.getLogger(__name__)


# ─── Milestone Management ────────────────────────────────────

def create_milestone(
    child_id: str,
    milestone_type: str,
    title: str,
    description: str | None = None,
    source: str = "manual",
) -> dict | None:
    """Create a new milestone entry."""
    return execute_returning(
        """
        INSERT INTO milestones (child_id, type, title, description, source)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id::text, child_id::text, type, title, description,
                  caption, detected_at, source
        """,
        (child_id, milestone_type, title, description, source),
    )


def list_milestones(child_id: str) -> list[dict]:
    """List all milestones for a child, newest first."""
    return fetch_all(
        """
        SELECT id::text, child_id::text, type, title, description,
               caption, detected_at, source
        FROM milestones
        WHERE child_id = %s
        ORDER BY detected_at DESC
        """,
        (child_id,),
    )


def delete_milestone(milestone_id: str, child_id: str) -> bool:
    """Delete a milestone."""
    row = fetch_one(
        "SELECT id FROM milestones WHERE id = %s AND child_id = %s",
        (milestone_id, child_id),
    )
    if not row:
        return False
    execute("DELETE FROM milestones WHERE id = %s", (milestone_id,))
    return True


# ─── Weekly Narratives ───────────────────────────────────────

def list_narratives(child_id: str, limit: int = 10) -> list[dict]:
    """List recent weekly narratives for a child."""
    return fetch_all(
        """
        SELECT id::text, child_id::text, week_start, week_end,
               narrative, analysis_count, soothe_count, created_at
        FROM weekly_narratives
        WHERE child_id = %s
        ORDER BY week_start DESC
        LIMIT %s
        """,
        (child_id, limit),
    )


# ─── Combined Garden View ───────────────────────────────────

def get_garden(child_id: str) -> dict:
    """Get the full Memory Garden view — milestones + narratives."""
    milestones = list_milestones(child_id)
    narratives = list_narratives(child_id)
    return {
        "child_id": child_id,
        "milestones": milestones,
        "narratives": narratives,
        "total_milestones": len(milestones),
        "total_narratives": len(narratives),
    }
