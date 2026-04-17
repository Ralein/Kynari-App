"""Smart Soothe Engine — personalised soothing technique recommendations.

Ranking algorithm:
  score = base_weight
        + (success_count / total_count) × personalisation_weight
        + time_of_day_bonus

Uses simple Bayesian updating from parent feedback.
No batch retraining — scores are recomputed on each plan request.
"""

import logging
from datetime import datetime

from database import fetch_all, fetch_one, execute_returning

logger = logging.getLogger(__name__)

# Personalisation kicks in after this many feedback events per child
PERSONALISATION_THRESHOLD = 5
# Weight given to personal history vs base weight
PERSONALISATION_WEIGHT = 0.6
# Maximum number of techniques to return per plan
MAX_TECHNIQUES = 4

# Time-of-day bonus map: (hour_range, need) → bonus
# e.g. swaddle ranks higher at night
TIME_BONUSES = {
    "sleepy": {(19, 7): 0.15},     # Evening–night: boost sleepy techniques
    "hungry": {(5, 8): 0.1},       # Early morning: boost feeding
    "calm":   {(9, 17): 0.1},      # Daytime: boost play/stimulation
}


def _hour_in_range(hour: int, start: int, end: int) -> bool:
    """Check if hour falls in range (handles wrapping past midnight)."""
    if start <= end:
        return start <= hour < end
    else:
        return hour >= start or hour < end


def get_plan(child_id: str, need: str, hour: int | None = None) -> dict:
    """Get a ranked playbook plan for a detected need.

    Returns top 4 techniques, scored by base weight + personal history
    + time-of-day bonus.
    """
    if hour is None:
        hour = datetime.now().hour

    # 1. Fetch all techniques for this need
    techniques = fetch_all(
        """
        SELECT id, need, name, description, icon, steps_json,
               timer_seconds, base_weight, sort_order
        FROM soothe_techniques
        WHERE need = %s
        ORDER BY sort_order
        """,
        (need,),
    )

    if not techniques:
        return {
            "need": need,
            "confidence": 0.0,
            "techniques": [],
            "personalised": False,
        }

    # 2. Fetch feedback history for this child + need
    feedback_rows = fetch_all(
        """
        SELECT technique_id::text,
               COUNT(*) AS total,
               SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS successes
        FROM soothe_feedback
        WHERE child_id = %s AND need = %s
        GROUP BY technique_id
        """,
        (child_id, need),
    )

    feedback_map: dict[str, dict] = {}
    total_feedback = 0
    for row in feedback_rows:
        tid = row["technique_id"]
        total = row["total"]
        successes = row["successes"]
        feedback_map[tid] = {
            "total": total,
            "successes": successes,
            "rate": successes / total if total > 0 else None,
        }
        total_feedback += total

    personalised = total_feedback >= PERSONALISATION_THRESHOLD

    # 3. Score each technique
    scored = []
    for tech in techniques:
        tid = str(tech["id"])
        base = tech["base_weight"]

        # Personal history bonus
        fb = feedback_map.get(tid, {})
        fb_total = fb.get("total", 0)
        fb_rate = fb.get("rate")

        if fb_rate is not None and fb_total >= 3:
            personal_score = fb_rate * PERSONALISATION_WEIGHT
        else:
            personal_score = 0.0

        # Time-of-day bonus
        tod_bonus = 0.0
        need_bonuses = TIME_BONUSES.get(need, {})
        for (start, end), bonus in need_bonuses.items():
            if _hour_in_range(hour, start, end):
                tod_bonus = bonus
                break

        final_score = base + personal_score + tod_bonus

        steps = tech["steps_json"] if isinstance(tech["steps_json"], list) else []

        scored.append({
            "technique_id": tid,
            "name": tech["name"],
            "description": tech["description"],
            "icon": tech["icon"],
            "steps": steps,
            "timer_seconds": tech["timer_seconds"],
            "success_rate": round(fb_rate, 4) if fb_rate is not None and fb_total >= 3 else None,
            "total_feedback": fb_total,
            "_score": final_score,
        })

    # 4. Sort by score descending, return top N
    scored.sort(key=lambda x: x["_score"], reverse=True)
    top = scored[:MAX_TECHNIQUES]

    # Remove internal score field
    for t in top:
        del t["_score"]

    return {
        "need": need,
        "confidence": 0.0,  # Will be set by the router from query params
        "techniques": top,
        "personalised": personalised,
    }


def record_feedback(
    child_id: str,
    need: str,
    technique_id: str,
    outcome: str,
    duration_seconds: int | None = None,
    notes: str | None = None,
) -> dict | None:
    """Record parent feedback for a technique in the Playbook."""
    hour = datetime.now().hour

    return execute_returning(
        """
        INSERT INTO soothe_feedback
            (child_id, technique_id, need, outcome, duration_seconds, notes, hour_of_day)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id::text AS feedback_id
        """,
        (child_id, technique_id, need, outcome, duration_seconds, notes, hour),
    )


def get_technique_stats(child_id: str) -> list[dict]:
    """Get per-technique success rate stats for a child."""
    rows = fetch_all(
        """
        SELECT
            sf.technique_id::text,
            st.name,
            sf.need,
            SUM(CASE WHEN sf.outcome = 'success' THEN 1 ELSE 0 END) AS success_count,
            SUM(CASE WHEN sf.outcome = 'fail' THEN 1 ELSE 0 END) AS fail_count,
            COUNT(*) AS total_count,
            CASE WHEN COUNT(*) >= 3
                THEN ROUND(SUM(CASE WHEN sf.outcome = 'success' THEN 1 ELSE 0 END)::numeric / COUNT(*), 4)
                ELSE NULL
            END AS success_rate,
            ROUND(AVG(sf.duration_seconds)::numeric, 0) AS avg_duration_seconds,
            MAX(sf.recorded_at) AS last_used
        FROM soothe_feedback sf
        JOIN soothe_techniques st ON st.id = sf.technique_id
        WHERE sf.child_id = %s
        GROUP BY sf.technique_id, st.name, sf.need
        ORDER BY total_count DESC
        """,
        (child_id,),
    )
    return rows


def list_techniques(need: str | None = None) -> list[dict]:
    """List all playbook techniques, optionally filtered by need."""
    if need:
        return fetch_all(
            """
            SELECT id::text AS technique_id, need, name, description, icon,
                   steps_json AS steps, timer_seconds, base_weight, sort_order
            FROM soothe_techniques
            WHERE need = %s
            ORDER BY sort_order
            """,
            (need,),
        )
    else:
        return fetch_all(
            """
            SELECT id::text AS technique_id, need, name, description, icon,
                   steps_json AS steps, timer_seconds, base_weight, sort_order
            FROM soothe_techniques
            ORDER BY need, sort_order
            """
        )
