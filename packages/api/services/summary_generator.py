"""Summary generator — creates daily and weekly summaries from emotion events.

Daily summaries aggregate emotions for a single day.
Weekly summaries identify trends across 7 days.
"""

import logging
from collections import defaultdict
from datetime import date, timedelta

from database import fetch_all
from services.baseline_engine import baseline_engine

logger = logging.getLogger(__name__)

EMOTION_LABELS = ["happy", "sad", "angry", "fearful", "neutral", "frustrated"]


class SummaryGenerator:
    """Generates daily and weekly summaries from emotion events."""

    async def generate_daily(self, child_id: str, target_date: str) -> dict | None:
        """
        Generate a daily summary for a specific date.
        Delegates to baseline_engine.generate_daily_summary which handles
        aggregation, distribution, deviation, and insight text.
        """
        return await baseline_engine.generate_daily_summary(child_id, target_date)

    async def generate_weekly(self, child_id: str, week_start: str) -> dict | None:
        """
        Generate a weekly narrative summary from 7 days of daily summaries.

        Returns trend data: emotion shifts, dominant patterns, notable changes.
        """
        start = date.fromisoformat(week_start)
        end = start + timedelta(days=6)

        summaries = fetch_all(
            """
            SELECT * FROM daily_summaries
            WHERE child_id = %s AND date >= %s AND date <= %s
            ORDER BY date
            """,
            (child_id, start.isoformat(), end.isoformat()),
        )

        if not summaries:
            return {
                "child_id": child_id,
                "week_start": week_start,
                "week_end": end.isoformat(),
                "days_with_data": 0,
                "narrative": "No data available for this week.",
                "trends": {},
                "dominant_emotions": [],
            }

        # Aggregate across the week
        total_events = sum(s["total_events"] for s in summaries)
        days_with_data = len(summaries)

        # Track dominant emotion per day
        dominant_sequence = [s["dominant_emotion"] for s in summaries]

        # Aggregate emotion distribution across the week
        weekly_distribution: dict[str, float] = defaultdict(float)
        for summary in summaries:
            dist = summary.get("emotion_distribution", {})
            for emotion in EMOTION_LABELS:
                weekly_distribution[emotion] += dist.get(emotion, 0)

        # Normalize to averages
        if days_with_data > 0:
            weekly_distribution = {
                e: round(v / days_with_data, 1)
                for e, v in weekly_distribution.items()
            }

        # Detect trends: compare first half vs second half
        trends = self._detect_trends(summaries)

        # Generate narrative
        narrative = self._generate_weekly_narrative(
            dominant_sequence, weekly_distribution, trends, total_events, days_with_data
        )

        return {
            "child_id": child_id,
            "week_start": week_start,
            "week_end": end.isoformat(),
            "days_with_data": days_with_data,
            "total_events": total_events,
            "weekly_distribution": dict(weekly_distribution),
            "dominant_emotions": dominant_sequence,
            "trends": trends,
            "narrative": narrative,
        }

    # ─── Private Helpers ─────────────────────────────────────

    def _detect_trends(self, summaries: list[dict]) -> dict:
        """Compare first half vs second half of the week to detect shifts."""
        if len(summaries) < 4:
            return {"status": "insufficient_data", "shifts": []}

        mid = len(summaries) // 2
        first_half = summaries[:mid]
        second_half = summaries[mid:]

        shifts = []
        for emotion in EMOTION_LABELS:
            first_avg = self._avg_emotion(first_half, emotion)
            second_avg = self._avg_emotion(second_half, emotion)
            delta = second_avg - first_avg

            if abs(delta) > 10:
                direction = "increasing" if delta > 0 else "decreasing"
                shifts.append({
                    "emotion": emotion,
                    "direction": direction,
                    "delta": round(delta, 1),
                    "first_half_avg": round(first_avg, 1),
                    "second_half_avg": round(second_avg, 1),
                })

        return {
            "status": "analyzed",
            "shifts": shifts,
        }

    def _avg_emotion(self, summaries: list[dict], emotion: str) -> float:
        """Average percentage for an emotion across summaries."""
        values = []
        for s in summaries:
            dist = s.get("emotion_distribution", {})
            values.append(dist.get(emotion, 0))
        return sum(values) / max(len(values), 1)

    def _generate_weekly_narrative(
        self,
        dominant_sequence: list[str],
        distribution: dict[str, float],
        trends: dict,
        total_events: int,
        days_with_data: int,
    ) -> str:
        """Generate a paragraph summarizing the week."""
        if days_with_data == 0:
            return "No data available for this week."

        from collections import Counter
        dominant_counts = Counter(dominant_sequence)
        most_common = dominant_counts.most_common(1)[0]
        main_emotion, main_count = most_common

        parts = []

        if main_count == days_with_data:
            parts.append(
                f"This week was consistently {main_emotion} "
                f"across all {days_with_data} days with data."
            )
        elif main_count >= days_with_data * 0.6:
            parts.append(
                f"{main_emotion.capitalize()} was the dominant emotion "
                f"on {main_count} of {days_with_data} days this week."
            )
        else:
            top_two = dominant_counts.most_common(2)
            parts.append(
                f"A mixed week with {top_two[0][0]} ({top_two[0][1]} days) "
                f"and {top_two[1][0]} ({top_two[1][1]} days) as the main emotions."
            )

        shifts = trends.get("shifts", [])
        if shifts:
            for shift in shifts[:2]:
                parts.append(
                    f"{shift['emotion'].capitalize()} is {shift['direction']} "
                    f"({shift['delta']:+.1f} percentage points)."
                )

        parts.append(f"{total_events} total readings across {days_with_data} days.")

        return " ".join(parts)


# Singleton instance
summary_generator = SummaryGenerator()
