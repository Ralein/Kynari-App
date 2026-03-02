"""Tests for the summary generator."""

import pytest
from unittest.mock import patch
from services.summary_generator import SummaryGenerator


class TestSummaryGenerator:
    """Test daily and weekly summary generation."""

    @pytest.fixture
    def generator(self):
        return SummaryGenerator()

    # ─── Weekly Summary ───────────────────────────────────

    @pytest.mark.asyncio
    async def test_generate_weekly_with_data(self, generator, sample_daily_summaries):
        """Should produce a weekly summary with trends."""
        with patch("services.summary_generator.fetch_all", return_value=sample_daily_summaries):
            result = await generator.generate_weekly("child-001", "2026-02-24")

        assert result is not None
        assert result["child_id"] == "child-001"
        assert result["days_with_data"] == 7
        assert result["total_events"] == 140  # 7 * 20
        assert len(result["dominant_emotions"]) == 7
        assert "narrative" in result
        assert len(result["narrative"]) > 0

    @pytest.mark.asyncio
    async def test_generate_weekly_no_data(self, generator):
        """Should return empty placeholder when no summaries exist."""
        with patch("services.summary_generator.fetch_all", return_value=[]):
            result = await generator.generate_weekly("child-001", "2026-02-24")

        assert result is not None
        assert result["days_with_data"] == 0
        assert "No data" in result["narrative"]

    @pytest.mark.asyncio
    async def test_weekly_trends_detected(self, generator, sample_daily_summaries):
        """Should detect trends when emotion shifts between halves."""
        with patch("services.summary_generator.fetch_all", return_value=sample_daily_summaries):
            result = await generator.generate_weekly("child-001", "2026-02-24")

        trends = result.get("trends", {})
        assert trends.get("status") == "analyzed"

    @pytest.mark.asyncio
    async def test_weekly_distribution_normalized(self, generator, sample_daily_summaries):
        """Weekly distribution should be averaged across days."""
        with patch("services.summary_generator.fetch_all", return_value=sample_daily_summaries):
            result = await generator.generate_weekly("child-001", "2026-02-24")

        dist = result.get("weekly_distribution", {})
        assert "happy" in dist
        assert "frustrated" in dist
        # Values should be averages, not sums
        assert dist["happy"] < 100

    # ─── Trend Detection ──────────────────────────────────

    def test_detect_trends_insufficient_data(self, generator):
        """Should return insufficient_data with < 4 summaries."""
        result = generator._detect_trends([{"emotion_distribution": {}}] * 3)
        assert result["status"] == "insufficient_data"

    def test_detect_trends_with_shift(self, generator):
        """Should detect a shift when 2nd half differs by >10 points."""
        summaries = [
            {"emotion_distribution": {"happy": 40, "sad": 10}},
            {"emotion_distribution": {"happy": 45, "sad": 10}},
            {"emotion_distribution": {"happy": 15, "sad": 35}},
            {"emotion_distribution": {"happy": 10, "sad": 40}},
        ]
        result = generator._detect_trends(summaries)
        assert result["status"] == "analyzed"
        shifts = result["shifts"]
        assert len(shifts) > 0
        emotions_shifting = [s["emotion"] for s in shifts]
        assert "happy" in emotions_shifting or "sad" in emotions_shifting

    # ─── Narrative Generation ─────────────────────────────

    def test_narrative_consistent_week(self, generator):
        """Narrative should mention consistency when one emotion dominates."""
        text = generator._generate_weekly_narrative(
            dominant_sequence=["happy"] * 5,
            distribution={"happy": 60, "neutral": 20, "sad": 10, "frustrated": 5, "angry": 3, "fearful": 2},
            trends={"status": "analyzed", "shifts": []},
            total_events=100,
            days_with_data=5,
        )
        assert "consistently" in text.lower() or "happy" in text.lower()
        assert "100" in text

    def test_narrative_mixed_week(self, generator):
        """Narrative should mention mixed emotions."""
        text = generator._generate_weekly_narrative(
            dominant_sequence=["happy", "sad", "happy", "frustrated", "sad"],
            distribution={"happy": 30, "neutral": 20, "sad": 25, "frustrated": 15, "angry": 5, "fearful": 5},
            trends={"status": "analyzed", "shifts": []},
            total_events=80,
            days_with_data=5,
        )
        assert "mixed" in text.lower() or "happy" in text.lower()
