"""Summary generator — creates daily summaries from emotion events.

Full implementation in Phase 2. This file defines the class interface.
"""


class SummaryGenerator:
    """Generates daily and weekly summaries from emotion events."""

    async def generate_daily(self, child_id: str, date: str) -> dict | None:
        """Generate a daily summary for a specific date."""
        # Phase 2 implementation
        pass

    async def generate_weekly(self, child_id: str, week_start: str) -> dict | None:
        """Generate a weekly narrative summary."""
        # Phase 2 implementation
        pass
