"""COPPA-compliant data retention service.

Manages data lifecycle: auto-purge expired events,
full child data deletion, and retention status reporting.
"""

import logging
from datetime import datetime, timedelta, timezone

from database import fetch_one, fetch_all, get_pool

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS = 90


class DataRetentionService:
    """Manages COPPA-compliant data retention and deletion."""

    async def purge_expired_events(self, child_id: str) -> int:
        """Delete emotion_events older than the child's retention window.

        Returns the count of events purged.
        """
        child = fetch_one(
            "SELECT data_retention_days FROM children WHERE id = %s",
            (child_id,),
        )

        retention_days = (child or {}).get(
            "data_retention_days", DEFAULT_RETENTION_DAYS
        )
        cutoff = (
            datetime.now(timezone.utc) - timedelta(days=retention_days)
        ).isoformat()

        pool = get_pool()
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM emotion_events
                    WHERE child_id = %s AND timestamp < %s
                    RETURNING id
                    """,
                    (child_id, cutoff),
                )
                deleted = cur.fetchall()
            conn.commit()

        purged = len(deleted)
        if purged > 0:
            logger.info(
                f"Purged {purged} events for child {child_id} "
                f"(older than {retention_days} days)"
            )
        return purged

    async def get_retention_status(self, child_id: str) -> dict:
        """Return retention status: oldest event, total events, window."""
        child = fetch_one(
            "SELECT data_retention_days FROM children WHERE id = %s",
            (child_id,),
        )
        retention_days = (child or {}).get(
            "data_retention_days", DEFAULT_RETENTION_DAYS
        )

        # Total events
        total_row = fetch_one(
            "SELECT COUNT(*) as count FROM emotion_events WHERE child_id = %s",
            (child_id,),
        )
        total_events = (total_row or {}).get("count", 0)

        # Oldest event
        oldest_row = fetch_one(
            """
            SELECT timestamp FROM emotion_events
            WHERE child_id = %s
            ORDER BY timestamp ASC
            LIMIT 1
            """,
            (child_id,),
        )
        oldest_event = oldest_row["timestamp"] if oldest_row else None

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
        pool = get_pool()
        result = {}

        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM emotion_events WHERE child_id = %s RETURNING id",
                    (child_id,),
                )
                result["events_deleted"] = len(cur.fetchall())

                cur.execute(
                    "DELETE FROM daily_summaries WHERE child_id = %s RETURNING id",
                    (child_id,),
                )
                result["summaries_deleted"] = len(cur.fetchall())

                cur.execute(
                    "DELETE FROM child_baselines WHERE child_id = %s RETURNING id",
                    (child_id,),
                )
                result["baselines_deleted"] = len(cur.fetchall())
            conn.commit()

        result["child_id"] = child_id
        logger.info(f"Full data purge for child {child_id}: {result}")
        return result


# Singleton
data_retention = DataRetentionService()
