"""Feedback store — collects and retrieves parent feedback corrections.

When a parent indicates the predicted need was wrong (e.g. "Not hungry, was sleepy"),
the correction is stored. In future versions this data can be used to personalize
the model per baby.

MVP: store-only, no fine-tuning.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from database import get_pool, fetch_all, fetch_one

logger = logging.getLogger(__name__)

NEED_LABELS = ["hungry", "diaper", "sleepy", "pain", "calm"]


class FeedbackStore:
    """Stores and retrieves parent feedback corrections."""

    def store_correction(
        self,
        event_id: str,
        child_id: str,
        original_label: str,
        corrected_label: str,
        parent_id: str,
    ) -> dict[str, Any]:
        """Store a parent's correction of a need prediction.

        Args:
            event_id: The need_event that was corrected
            child_id: The child the event belongs to
            original_label: What the model predicted
            corrected_label: What the parent says was correct
            parent_id: Who submitted the correction

        Returns:
            Confirmation dict with feedback_id
        """
        if corrected_label not in NEED_LABELS:
            return {
                "success": False,
                "error": "invalid_label",
                "message": f"Invalid need label: {corrected_label}. Must be one of: {NEED_LABELS}",
            }

        now = datetime.now(timezone.utc)
        pool = get_pool()

        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO feedback_corrections
                        (event_id, child_id, original_label, corrected_label, parent_id, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (event_id, child_id, original_label, corrected_label, parent_id, now),
                )
                row = cur.fetchone()
                feedback_id = row[0] if row else None
            conn.commit()

        logger.info(
            f"Feedback stored: event={event_id} {original_label}→{corrected_label} "
            f"by parent={parent_id}"
        )

        return {
            "success": True,
            "feedback_id": str(feedback_id),
            "original_label": original_label,
            "corrected_label": corrected_label,
        }

    def get_accuracy_stats(self, child_id: str) -> dict[str, Any]:
        """Get feedback accuracy statistics for a child.

        Returns per-label accuracy and overall correction rate.
        """
        corrections = fetch_all(
            """
            SELECT original_label, corrected_label, created_at
            FROM feedback_corrections
            WHERE child_id = %s
            ORDER BY created_at DESC
            """,
            (child_id,),
        )

        if not corrections:
            return {
                "child_id": child_id,
                "total_feedback": 0,
                "accuracy_rate": None,
                "per_label": {},
                "message": "No feedback data yet.",
            }

        total = len(corrections)
        correct = sum(1 for c in corrections if c["original_label"] == c["corrected_label"])

        # Per-label stats
        label_stats: dict[str, dict[str, int]] = {}
        for label in NEED_LABELS:
            predicted_as = [c for c in corrections if c["original_label"] == label]
            if predicted_as:
                was_correct = sum(1 for c in predicted_as if c["corrected_label"] == label)
                label_stats[label] = {
                    "predictions": len(predicted_as),
                    "correct": was_correct,
                    "accuracy": round(was_correct / len(predicted_as) * 100, 1),
                }

        # Most common corrections (confusion pairs)
        confusion_pairs: dict[str, int] = {}
        for c in corrections:
            if c["original_label"] != c["corrected_label"]:
                pair = f"{c['original_label']}→{c['corrected_label']}"
                confusion_pairs[pair] = confusion_pairs.get(pair, 0) + 1

        top_confusions = sorted(confusion_pairs.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "child_id": child_id,
            "total_feedback": total,
            "accuracy_rate": round(correct / total * 100, 1),
            "per_label": label_stats,
            "top_confusions": [{"pair": p, "count": c} for p, c in top_confusions],
        }

    def get_recent_corrections(self, child_id: str, limit: int = 20) -> list[dict]:
        """Get recent feedback corrections for a child."""
        return fetch_all(
            """
            SELECT id, event_id, original_label, corrected_label, created_at
            FROM feedback_corrections
            WHERE child_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (child_id, limit),
        )


# Singleton
feedback_store = FeedbackStore()
