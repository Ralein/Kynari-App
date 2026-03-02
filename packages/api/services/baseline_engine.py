"""Baseline engine — calculates emotional baselines for each child.

Uses a rolling 14-day window to compute per-emotion frequency stats.
After 7+ unique days of data, calibration is marked complete and
z-score deviations become available.
"""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from database import get_supabase

logger = logging.getLogger(__name__)

# ─── Constants ───────────────────────────────────────────────
CALIBRATION_DAYS = 7       # minimum days before calibration is "complete"
BASELINE_WINDOW_DAYS = 14  # rolling window for baseline calculation
EMOTION_LABELS = ["happy", "sad", "angry", "fearful", "neutral", "frustrated"]


class BaselineEngine:
    """Rolling baseline calculator for per-child emotion patterns."""

    # ─── Public API ──────────────────────────────────────────

    async def ingest_events(self, child_id: str, events: list) -> None:
        """After events are stored, trigger baseline recalculation."""
        logger.info(f"Ingesting {len(events)} events for child {child_id}")
        await self.recalculate_baseline(child_id)

        # Also generate/update today's summary
        today = date.today().isoformat()
        await self.generate_daily_summary(child_id, today)

    async def recalculate_baseline(self, child_id: str) -> dict | None:
        """
        Recalculate rolling 14-day baseline for each emotion class.

        For each emotion, computes:
        - mean_frequency: average events per day
        - std_deviation: standard deviation of daily counts
        - days_of_data: unique days with at least one event
        - calibration_complete: True if days_of_data >= CALIBRATION_DAYS
        """
        db = get_supabase()

        # Fetch events from the last 14 days
        window_start = (date.today() - timedelta(days=BASELINE_WINDOW_DAYS)).isoformat()
        result = (
            db.table("emotion_events")
            .select("emotion_label, timestamp")
            .eq("child_id", child_id)
            .gte("timestamp", f"{window_start}T00:00:00Z")
            .execute()
        )

        events = result.data or []
        if not events:
            logger.info(f"No events found for child {child_id} in baseline window")
            return None

        # Group events by (emotion, date)
        daily_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        all_dates: set[str] = set()

        for event in events:
            emotion = event["emotion_label"]
            event_date = event["timestamp"][:10]  # YYYY-MM-DD
            daily_counts[emotion][event_date] += 1
            all_dates.add(event_date)

        total_unique_days = len(all_dates)
        calibrated = total_unique_days >= CALIBRATION_DAYS

        # Calculate stats per emotion and upsert
        baselines = {}
        for emotion in EMOTION_LABELS:
            counts = daily_counts.get(emotion, {})
            # Use all dates in period for mean (even if 0 events for this emotion)
            daily_values = [counts.get(d, 0) for d in all_dates]

            if not daily_values:
                mean = 0.0
                std = 0.0
            else:
                mean = sum(daily_values) / len(daily_values)
                variance = sum((x - mean) ** 2 for x in daily_values) / max(len(daily_values), 1)
                std = variance ** 0.5

            baseline_data = {
                "child_id": child_id,
                "emotion": emotion,
                "mean_frequency": round(mean, 4),
                "std_deviation": round(std, 4),
                "calibration_complete": calibrated,
                "days_of_data": total_unique_days,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }

            # Upsert into child_baselines (unique on child_id + emotion)
            db.table("child_baselines").upsert(
                baseline_data,
                on_conflict="child_id,emotion",
            ).execute()

            baselines[emotion] = baseline_data

        logger.info(
            f"Baseline recalculated for child {child_id}: "
            f"{total_unique_days} days, calibrated={calibrated}"
        )
        return baselines

    async def get_deviation(
        self, child_id: str, emotion: str, current_frequency: float
    ) -> float | None:
        """
        Returns z-score deviation from baseline.
        None if not calibrated or std_deviation is 0.

        z = (current - mean) / std
        """
        db = get_supabase()
        result = (
            db.table("child_baselines")
            .select("mean_frequency, std_deviation, calibration_complete")
            .eq("child_id", child_id)
            .eq("emotion", emotion)
            .single()
            .execute()
        )

        baseline = result.data
        if not baseline or not baseline.get("calibration_complete"):
            return None

        std = baseline["std_deviation"]
        if std == 0:
            return 0.0  # No variation — no deviation

        mean = baseline["mean_frequency"]
        z_score = (current_frequency - mean) / std
        return round(z_score, 3)

    async def generate_daily_summary(self, child_id: str, target_date: str) -> dict | None:
        """
        Generate a DailySummary for a given date.

        Aggregates events, calculates emotion distribution,
        detects deviations from baseline, and writes an insight.
        """
        db = get_supabase()

        # Fetch events for the target date
        result = (
            db.table("emotion_events")
            .select("emotion_label, confidence, timestamp")
            .eq("child_id", child_id)
            .gte("timestamp", f"{target_date}T00:00:00Z")
            .lt("timestamp", f"{target_date}T23:59:59Z")
            .execute()
        )

        events = result.data or []
        if not events:
            return None

        total = len(events)

        # Count per emotion
        counts: dict[str, int] = defaultdict(int)
        for event in events:
            counts[event["emotion_label"]] += 1

        # Distribution as percentages
        distribution = {
            emotion: round((counts.get(emotion, 0) / total) * 100, 1)
            for emotion in EMOTION_LABELS
        }

        # Dominant emotion
        dominant = max(counts, key=counts.get)  # type: ignore

        # Baseline deviation for dominant emotion
        deviation = await self.get_deviation(child_id, dominant, counts[dominant])

        # Generate insight text
        insight = await self._generate_insight(child_id, counts, events, target_date)

        summary_data = {
            "child_id": child_id,
            "date": target_date,
            "dominant_emotion": dominant,
            "emotion_distribution": distribution,
            "total_events": total,
            "baseline_deviation": deviation,
            "insight_text": insight,
        }

        # Upsert into daily_summaries (unique on child_id + date)
        db.table("daily_summaries").upsert(
            summary_data,
            on_conflict="child_id,date",
        ).execute()

        logger.info(
            f"Daily summary generated for child {child_id} on {target_date}: "
            f"{total} events, dominant={dominant}"
        )
        return summary_data

    # ─── Private Helpers ─────────────────────────────────────

    async def _generate_insight(
        self,
        child_id: str,
        counts: dict[str, int],
        events: list,
        target_date: str,
    ) -> str:
        """Generate a human-readable insight about the day's emotions."""
        total = sum(counts.values())
        if total == 0:
            return "No emotional data recorded today."

        dominant = max(counts, key=counts.get)  # type: ignore
        dominant_pct = round((counts[dominant] / total) * 100)

        # Check for spikes — any emotion > 40% that isn't 'neutral'
        spikes = [
            (emotion, round((count / total) * 100))
            for emotion, count in counts.items()
            if emotion != "neutral" and count / total > 0.4
        ]

        # Detect time-of-day patterns
        hourly: dict[str, dict[int, int]] = defaultdict(lambda: defaultdict(int))
        for event in events:
            hour = int(event["timestamp"][11:13])
            hourly[event["emotion_label"]][hour] += 1

        time_insights = []
        for emotion, hours in hourly.items():
            if emotion == "neutral":
                continue
            if hours:
                peak_hour = max(hours, key=hours.get)  # type: ignore
                if hours[peak_hour] >= 3:  # at least 3 events in one hour
                    period = _hour_to_period(peak_hour)
                    time_insights.append(f"{emotion} around {period}")

        # Build insight text
        if spikes:
            spike_emotion, spike_pct = spikes[0]
            insight = f"Mostly {spike_emotion} today ({spike_pct}% of readings)."
        elif dominant == "happy":
            insight = f"A positive day! Happy was the dominant emotion ({dominant_pct}%)."
        elif dominant == "neutral":
            insight = f"A calm, steady day with mostly neutral readings ({dominant_pct}%)."
        else:
            insight = f"{dominant.capitalize()} was the most frequent emotion today ({dominant_pct}%)."

        # Add time patterns
        if time_insights:
            insight += f" Notable patterns: {', '.join(time_insights)}."

        # Check baseline deviation
        deviation = await self.get_deviation(child_id, dominant, counts[dominant])
        if deviation is not None and abs(deviation) > 1.5:
            direction = "more" if deviation > 0 else "less"
            insight += f" This is {direction} {dominant} than usual."

        return insight


def _hour_to_period(hour: int) -> str:
    """Convert hour (0-23) to a readable time period."""
    if hour < 6:
        return f"{hour}–{hour + 1}am (early morning)"
    elif hour < 12:
        h = hour if hour != 0 else 12
        return f"{h}–{h + 1}am"
    elif hour == 12:
        return "12–1pm"
    elif hour < 17:
        return f"{hour - 12}–{hour - 11}pm"
    elif hour < 20:
        return f"{hour - 12}–{hour - 11}pm (evening)"
    else:
        return f"{hour - 12}–{hour - 11}pm (night)"


# Singleton instance
baseline_engine = BaselineEngine()
