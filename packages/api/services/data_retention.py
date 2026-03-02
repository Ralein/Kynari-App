"""COPPA-compliant data retention service.

Manages data lifecycle: auto-purge expired events,
full child data deletion, and retention status reporting.
"""

import logging
from datetime import datetime, timedelta, timezone

from database import get_supabase

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS = 90


class DataRetentionService:
    """Manages COPPA-compliant data retention and deletion."""

    async def purge_expired_events(self, child_id: str) -> int:
        """Delete emotion_events older than the child's retention window.

        Returns the count of events purged.
        """
        db = get_supabase()

        # Get the child's retention setting
        child = (
            db.table("children")
            .select("data_retention_days")
            .eq("id", child_id)
            .single()
            .execute()
        )

        retention_days = (child.data or {}).get(
            "data_retention_days", DEFAULT_RETENTION_DAYS
        )
        cutoff = (
            datetime.now(timezone.utc) - timedelta(days=retention_days)
        ).isoformat()

        # Delete old events
        result = (
            db.table("emotion_events")
            .delete()
            .eq("child_id", child_id)
            .lt("timestamp", cutoff)
            .execute()
        )

        purged = len(result.data or [])
        if purged > 0:
            logger.info(
                f"Purged {purged} events for child {child_id} "
                f"(older than {retention_days} days)"
            )
        return purged

    async def get_retention_status(self, child_id: str) -> dict:
        """Return retention status: oldest event, total events, window."""
        db = get_supabase()

        # Get retention setting
        child = (
            db.table("children")
            .select("data_retention_days")
            .eq("id", child_id)
            .single()
            .execute()
        )
        retention_days = (child.data or {}).get(
            "data_retention_days", DEFAULT_RETENTION_DAYS
        )

        # Total events
        total_result = (
            db.table("emotion_events")
            .select("id", count="exact")
            .eq("child_id", child_id)
            .execute()
        )
        total_events = total_result.count or 0

        # Oldest event
        oldest_result = (
            db.table("emotion_events")
            .select("timestamp")
            .eq("child_id", child_id)
            .order("timestamp")
            .limit(1)
            .execute()
        )
        oldest_event = (
            oldest_result.data[0]["timestamp"] if oldest_result.data else None
        )

        return {
            "child_id": child_id,
            "retention_days": retention_days,
            "total_events": total_events,
            "oldest_event": oldest_event,
        }

    async def purge_all_child_data(self, child_id: str) -> dict:
        """Full data deletion for COPPA right-to-delete.

        Deletes: emotion_events, daily_summaries, child_baselines.
        The children row itself is deleted via the router (CASCADE handles the rest).
        """
        db = get_supabase()

        events = db.table("emotion_events").delete().eq("child_id", child_id).execute()
        summaries = (
            db.table("daily_summaries").delete().eq("child_id", child_id).execute()
        )
        baselines = (
            db.table("child_baselines").delete().eq("child_id", child_id).execute()
        )

        result = {
            "child_id": child_id,
            "events_deleted": len(events.data or []),
            "summaries_deleted": len(summaries.data or []),
            "baselines_deleted": len(baselines.data or []),
        }
        logger.info(f"Full data purge for child {child_id}: {result}")
        return result


# Singleton
data_retention = DataRetentionService()
