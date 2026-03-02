"""Baseline engine — calculates emotional baselines for each child.

Full implementation in Phase 1. This file defines the class interface.
"""


class BaselineEngine:
    """Rolling baseline calculator for per-child emotion patterns."""

    async def ingest_events(self, child_id: str, events: list) -> None:
        """Store emotion events and trigger baseline recalculation."""
        # Phase 1 implementation
        pass

    async def recalculate_baseline(self, child_id: str) -> dict | None:
        """Recalculate rolling 14-day baseline for each emotion class."""
        # Phase 1 implementation
        pass

    async def get_deviation(
        self, child_id: str, emotion: str, current_frequency: float
    ) -> float | None:
        """Returns z-score deviation from baseline. None if not calibrated."""
        # Phase 1 implementation
        pass

    async def generate_daily_summary(self, child_id: str, date: str) -> dict | None:
        """Generate a DailySummary for a given date."""
        # Phase 1 implementation
        pass
