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
    "You are a warm, empathetic baby care assistant. "
    "You help parents understand their baby's need patterns — "
    "feeding, sleep, comfort, and diaper schedules. "
    "Speak like a knowledgeable friend, not a clinician. "
    "Keep responses under 200 words. Never diagnose. Always be encouraging. "
    "Focus on actionable suggestions about feeding schedules, nap timing, and comfort techniques."
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
            SELECT * FROM need_daily_summaries
            WHERE child_id = %s AND date >= %s AND date <= %s
            ORDER BY date
            """,
            (child_id, week_start.isoformat(), week_end.isoformat()),
        )

        if not summary_data:
            narrative = (
                f"No data was recorded for {child_name} this week. "
                f"Try recording a few cry samples each day to start "
                f"capturing your baby's need patterns."
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
        """Call Anthropic Claude API to generate narrative using LangChain."""
        if not api_key:
            return self._generate_fallback(child_name, summaries)

        try:
            from langchain_anthropic import ChatAnthropic
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.messages import SystemMessage

            llm = ChatAnthropic(
                model_name="claude-3-5-sonnet-20240620",
                api_key=api_key,
                max_tokens=300,
            )

            # Build summary digest
            digest_lines = []
            for s in summaries:
                dist = s.get("need_distribution", {})
                digest_lines.append(
                    f"- {s['date']}: dominant_need={s['dominant_need']}, "
                    f"events={s['total_events']}, "
                    f"distribution={dist}"
                )
            digest = "\n".join(digest_lines)

            dominant_needs = [s["dominant_need"] for s in summaries]
            insights = [s.get("insight_text", "") for s in summaries if s.get("insight_text")]

            prompt_template = ChatPromptTemplate.from_messages([
                SystemMessage(content=SYSTEM_PROMPT),
                ("user", "Here is {child_name}'s need data for the week of {week_start}:\n\n"
                 "Daily summaries:\n{digest}\n\n"
                 "Notable insights: {insights}\n\n"
                 "Dominant needs this week: {dominant_needs}\n\n"
                 "Write a warm weekly narrative for the parent. Include:\n"
                 "1. What kind of week it was for the baby's needs (1 sentence)\n"
                 "2. The most notable pattern — feeding, sleep, or comfort (1-2 sentences)\n"
                 "3. One gentle, actionable suggestion for next week (1 sentence)\n"
                 "Keep it under 200 words."),
            ])

            chain = prompt_template | llm
            
            response = await chain.ainvoke({
                "child_name": child_name,
                "week_start": week_start.isoformat(),
                "digest": digest,
                "insights": "; ".join(insights) if insights else "None",
                "dominant_needs": ", ".join(dominant_needs),
            })

            return response.content

        except Exception as e:
            logger.error(f"Claude API error (LangChain): {e}")
            return self._generate_fallback(child_name, summaries)

    def _generate_fallback(self, child_name: str, summaries: list[dict]) -> str:
        """Generate a simple narrative without AI (fallback)."""
        if not summaries:
            return f"No data recorded for {child_name} this week."

        dominant_needs = [s["dominant_need"] for s in summaries]
        from collections import Counter

        most_common = Counter(dominant_needs).most_common(1)[0][0]
        total_events = sum(s.get("total_events", 0) for s in summaries)
        days_with_data = len(summaries)

        need_desc = {
            "hungry": "hungry",
            "diaper": "needing diaper changes",
            "sleepy": "sleepy",
            "pain": "uncomfortable",
            "calm": "calm and content",
        }
        desc = need_desc.get(most_common, most_common)

        return (
            f"{child_name} was mostly {desc} this week with "
            f"{total_events} detected events across {days_with_data} days. "
            f"Keep recording — every day of data helps "
            f"Kynari learn your baby's unique patterns."
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
