"""AI-powered weekly narrative report generator.

Uses Anthropic Claude to create warm, parent-friendly weekly
summaries of a child's emotional patterns.
"""

import json
import logging
from datetime import date, timedelta

from database import fetch_one, fetch_all, get_pool
from config import get_settings

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are a warm, empathetic child development assistant. "
    "You help parents understand their toddler's emotional patterns. "
    "Speak like a knowledgeable friend, not a clinician. "
    "Keep responses under 200 words. Never diagnose. Always be encouraging."
)


class AIReportService:
    """Generates AI-powered weekly narrative reports."""

    async def generate_weekly_narrative(
        self, child_id: str, week_start: date
    ) -> str:
        """Generate a warm weekly narrative using Claude.

        1. Fetches DailySummaries for the week
        2. Builds a structured prompt
        3. Calls Anthropic API
        4. Stores result in weekly_reports table
        5. Returns narrative string
        """
        settings = get_settings()
        week_end = week_start + timedelta(days=6)

        # Get child name
        child = fetch_one(
            "SELECT name FROM children WHERE id = %s",
            (child_id,),
        )
        child_name = (child or {}).get("name", "your child")

        # Fetch daily summaries for the week
        summary_data = fetch_all(
            """
            SELECT * FROM daily_summaries
            WHERE child_id = %s AND date >= %s AND date <= %s
            ORDER BY date
            """,
            (child_id, week_start.isoformat(), week_end.isoformat()),
        )

        if not summary_data:
            narrative = (
                f"No emotion data was recorded for {child_name} this week. "
                f"Try placing the phone in the room during play time to start "
                f"capturing emotional patterns."
            )
        else:
            narrative = await self._call_claude(
                child_name, week_start, summary_data, settings.anthropic_api_key
            )

        # Store the report
        pool = get_pool()
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO weekly_reports (child_id, week_start, narrative)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (child_id, week_start) DO UPDATE SET narrative = EXCLUDED.narrative
                    """,
                    (child_id, week_start.isoformat(), narrative),
                )
            conn.commit()

        return narrative

    async def _call_claude(
        self,
        child_name: str,
        week_start: date,
        summaries: list[dict],
        api_key: str,
    ) -> str:
        """Call Anthropic Claude API to generate narrative."""
        if not api_key:
            return self._generate_fallback(child_name, summaries)

        try:
            import anthropic

            client = anthropic.Anthropic(api_key=api_key)

            # Build summary digest
            digest_lines = []
            for s in summaries:
                dist = s.get("emotion_distribution", {})
                digest_lines.append(
                    f"- {s['date']}: dominant={s['dominant_emotion']}, "
                    f"events={s['total_events']}, "
                    f"distribution={dist}"
                )
            digest = "\n".join(digest_lines)

            # Notable patterns
            dominant_emotions = [s["dominant_emotion"] for s in summaries]
            insights = [s.get("insight_text", "") for s in summaries if s.get("insight_text")]

            user_prompt = (
                f"Here is {child_name}'s emotional data for the week of "
                f"{week_start.isoformat()}:\n\n"
                f"Daily summaries:\n{digest}\n\n"
                f"Notable insights: {'; '.join(insights) if insights else 'None'}\n\n"
                f"Dominant emotions this week: {', '.join(dominant_emotions)}\n\n"
                f"Write a warm weekly narrative for the parent. Include:\n"
                f"1. What kind of week it was emotionally (1 sentence)\n"
                f"2. The most notable pattern or moment (1-2 sentences)\n"
                f"3. One gentle, actionable suggestion (1 sentence)\n"
                f"Keep it under 200 words."
            )

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )

            return message.content[0].text

        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return self._generate_fallback(child_name, summaries)

    def _generate_fallback(self, child_name: str, summaries: list[dict]) -> str:
        """Generate a simple narrative without AI (fallback)."""
        if not summaries:
            return f"No data recorded for {child_name} this week."

        dominant_emotions = [s["dominant_emotion"] for s in summaries]
        from collections import Counter

        most_common = Counter(dominant_emotions).most_common(1)[0][0]
        total_events = sum(s.get("total_events", 0) for s in summaries)
        days_with_data = len(summaries)

        return (
            f"{child_name} had a mostly {most_common} week with "
            f"{total_events} emotion events across {days_with_data} days. "
            f"Keep up the great monitoring — every day of data helps "
            f"Kynari learn your child's unique emotional patterns."
        )

    async def get_weekly_report(
        self, child_id: str, week_start: date
    ) -> dict | None:
        """Retrieve a stored weekly report."""
        return fetch_one(
            "SELECT * FROM weekly_reports WHERE child_id = %s AND week_start = %s",
            (child_id, week_start.isoformat()),
        )


# Singleton
ai_report = AIReportService()
