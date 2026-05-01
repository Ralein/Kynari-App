"""Milestone detection is automated via APScheduler, scanning for patterns
in emotion events. Weekly narratives are generated using Claude
to synthesize the week's emotional journey.
"""

import logging
from datetime import date, timedelta
from database import fetch_one, fetch_all, execute_returning, execute
from config import get_settings

logger = logging.getLogger(__name__)

MILESTONE_PATTERNS = [
    {"type": "first_smile", "emotion": "happy", "confidence": 0.85, "title": "First Big Smile"},
    {"type": "first_laugh", "emotion": "happy", "confidence": 0.95, "title": "First Belly Laugh"},
]


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
               narrative, analysis_count, soothe_count AS playbook_count, created_at
        FROM weekly_narratives
        WHERE child_id = %s
        ORDER BY week_start DESC
        LIMIT %s
        """,
        (child_id, limit),
    )


# ─── Garden Composite ────────────────────────────────────────

def get_garden(child_id: str) -> dict:
    """Get the full Memory Garden data — milestones + weekly narratives."""
    milestones = list_milestones(child_id)
    narratives = list_narratives(child_id)
    return {
        "child_id": child_id,
        "milestones": milestones,
        "narratives": narratives,
        "total_milestones": len(milestones),
        "total_narratives": len(narratives),
    }


# ─── Background Jobs ─────────────────────────────────────────

async def detect_milestones_job():
    """Scan recent emotion events to auto-detect baby milestones."""
    logger.info("Running detect_milestones_job...")
    
    # Get all children
    children = fetch_all("SELECT id::text FROM children")
    
    for child in children:
        child_id = child["id"]
        
        # Check patterns
        for pattern in MILESTONE_PATTERNS:
            # Check if already exists
            exists = fetch_one(
                "SELECT id FROM milestones WHERE child_id = %s AND type = %s",
                (child_id, pattern["type"])
            )
            if exists:
                continue
                
            # Look for recent event (last 24h) matching pattern
            event = fetch_one(
                """
                SELECT id, timestamp FROM emotion_events
                WHERE child_id = %s AND emotion_label = %s AND confidence >= %s
                AND timestamp > now() - interval '24 hours'
                ORDER BY confidence DESC
                LIMIT 1
                """,
                (child_id, pattern["emotion"], pattern["confidence"])
            )
            
            if event:
                logger.info(f"Auto-detected milestone {pattern['type']} for child {child_id}")
                create_milestone(
                    child_id=child_id,
                    milestone_type=pattern["type"],
                    title=pattern["title"],
                    description=f"Auto-detected during a {pattern['emotion']} moment.",
                    source="auto_detected"
                )

async def generate_weekly_narrative_job():
    """Generate weekly summaries for all children using Claude."""
    logger.info("Running generate_weekly_narrative_job...")
    
    today = date.today()
    # Go back to last Monday
    last_mon = today - timedelta(days=today.weekday() + 7)
    last_sun = last_mon + timedelta(days=6)
    
    children = fetch_all("SELECT id::text, name FROM children")
    for child in children:
        child_id = child["id"]
        
        # Check if already generated
        exists = fetch_one(
            "SELECT id FROM weekly_narratives WHERE child_id = %s AND week_start = %s",
            (child_id, last_mon)
        )
        if exists:
            continue
            
        # Gather data for the week
        analysis_count = fetch_one(
            "SELECT COUNT(*) as count FROM analysis_sessions WHERE child_id = %s AND created_at >= %s AND created_at <= %s",
            (child_id, last_mon, last_sun)
        )["count"]
        
        playbook_count = fetch_one(
            "SELECT COUNT(*) as count FROM soothe_feedback WHERE child_id = %s AND recorded_at >= %s AND recorded_at <= %s",
            (child_id, last_mon, last_sun)
        )["count"]
        
        # If no activity, skip or generate "quiet week"
        if analysis_count == 0 and playbook_count == 0:
            continue
            
        # Call Claude for narrative
        narrative = await _call_claude_for_narrative(child["name"], last_mon, last_sun, analysis_count, playbook_count)
        
        # Store
        execute(
            """
            INSERT INTO weekly_narratives (child_id, week_start, week_end, narrative, analysis_count, soothe_count)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (child_id, last_mon, last_sun, narrative, analysis_count, playbook_count)
        )
        logger.info(f"Generated weekly narrative for child {child_id}")

async def _call_claude_for_narrative(child_name, start, end, analysis_count, playbook_count):
    """Internal helper to call Anthropic for a story-like narrative."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        return f"It was a busy week for {child_name}! We saw {analysis_count} developmental highlights and used care techniques {playbook_count} times. (Fallback: AI narrative unavailable)"

    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatAnthropic(
            model_name="claude-3-5-sonnet-20240620",
            api_key=settings.anthropic_api_key,
            max_tokens=300,
        )
        
        system_msg = SystemMessage(content=(
            "You are a warm, poetic AI chronicler for a baby's 'Memory Garden'. "
            "Your job is to transform raw activity data into a 'Weekly Story' that feels like a precious memory. "
            "Use gentle, evocative language. Focus on growth, love, and connection. "
            "Keep it under 150 words."
        ))
        
        human_msg = HumanMessage(content=(
            f"Here is the weekly data for {child_name} ({start} to {end}):\n"
            f"- Developmental analysis readings: {analysis_count}\n"
            f"- Care techniques shared: {playbook_count}\n\n"
            "Write a short, heart-warming story summarizing this week for the parent's scrapbook."
        ))
        
        response = await llm.ainvoke([system_msg, human_msg])
        return response.content
    except Exception as e:
        logger.error(f"Error generating narrative: {e}")
        return f"A week filled with {analysis_count} moments of discovery and {playbook_count} moments of comfort for {child_name}."
