"""Tests for the baseline engine."""

import pytest
from unittest.mock import patch, MagicMock
from services.baseline_engine import BaselineEngine, _hour_to_period


class TestBaselineEngine:
    """Test baseline calculation and deviation detection."""

    @pytest.fixture
    def engine(self):
        return BaselineEngine()

    # ─── Recalculate Baseline ─────────────────────────────

    @pytest.mark.asyncio
    async def test_recalculate_baseline_with_data(self, engine, mock_db, sample_events_multiday):
        """Baseline should compute mean/std from multiday events."""
        mock_db.set_table_data("emotion_events", sample_events_multiday)
        mock_db.set_table_data("child_baselines", [])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            result = await engine.recalculate_baseline("child-001")

        assert result is not None
        assert "happy" in result
        assert "sad" in result
        assert result["happy"]["mean_frequency"] > 0
        assert result["happy"]["calibration_complete"] is True  # 10 days > 7
        assert result["happy"]["days_of_data"] == 10

    @pytest.mark.asyncio
    async def test_recalculate_baseline_no_events(self, engine, mock_db):
        """Should return None when there are no events."""
        mock_db.set_table_data("emotion_events", [])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            result = await engine.recalculate_baseline("child-001")

        assert result is None

    @pytest.mark.asyncio
    async def test_calibration_incomplete_few_days(self, engine, mock_db):
        """Calibration should be False with < 7 days of data."""
        # Only 3 days of events
        events = []
        for day in range(3):
            events.append({
                "emotion_label": "happy",
                "timestamp": f"2026-03-0{day + 1}T10:00:00Z",
            })

        mock_db.set_table_data("emotion_events", events)
        mock_db.set_table_data("child_baselines", [])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            result = await engine.recalculate_baseline("child-001")

        assert result is not None
        assert result["happy"]["calibration_complete"] is False
        assert result["happy"]["days_of_data"] == 3

    # ─── Get Deviation ────────────────────────────────────

    @pytest.mark.asyncio
    async def test_get_deviation_calibrated(self, engine, mock_db):
        """Should return z-score when calibrated."""
        mock_db.set_table_data("child_baselines", [{
            "mean_frequency": 4.0,
            "std_deviation": 1.0,
            "calibration_complete": True,
        }])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            z = await engine.get_deviation("child-001", "happy", 6.0)

        assert z == 2.0  # (6 - 4) / 1

    @pytest.mark.asyncio
    async def test_get_deviation_not_calibrated(self, engine, mock_db):
        """Should return None when not calibrated."""
        mock_db.set_table_data("child_baselines", [{
            "mean_frequency": 4.0,
            "std_deviation": 1.0,
            "calibration_complete": False,
        }])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            z = await engine.get_deviation("child-001", "happy", 6.0)

        assert z is None

    @pytest.mark.asyncio
    async def test_get_deviation_zero_std(self, engine, mock_db):
        """Should return 0.0 when std is zero (no variation)."""
        mock_db.set_table_data("child_baselines", [{
            "mean_frequency": 4.0,
            "std_deviation": 0.0,
            "calibration_complete": True,
        }])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            z = await engine.get_deviation("child-001", "happy", 6.0)

        assert z == 0.0

    @pytest.mark.asyncio
    async def test_get_deviation_no_baseline(self, engine, mock_db):
        """Should return None when no baseline exists."""
        mock_db.set_table_data("child_baselines", [])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            z = await engine.get_deviation("child-001", "happy", 6.0)

        assert z is None

    # ─── Daily Summary ────────────────────────────────────

    @pytest.mark.asyncio
    async def test_generate_daily_summary(self, engine, mock_db, sample_events):
        """Should produce a summary with correct dominant emotion."""
        mock_db.set_table_data("emotion_events", sample_events)
        mock_db.set_table_data("child_baselines", [])
        mock_db.set_table_data("daily_summaries", [])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            result = await engine.generate_daily_summary("child-001", "2026-03-01")

        assert result is not None
        assert result["child_id"] == "child-001"
        assert result["date"] == "2026-03-01"
        assert result["total_events"] == 10
        assert result["dominant_emotion"] == "happy"  # 4 happy events
        assert "emotion_distribution" in result
        assert "insight_text" in result
        assert len(result["insight_text"]) > 0

    @pytest.mark.asyncio
    async def test_generate_daily_summary_no_events(self, engine, mock_db):
        """Should return None when no events exist for the date."""
        mock_db.set_table_data("emotion_events", [])

        with patch("services.baseline_engine.get_supabase", return_value=mock_db):
            result = await engine.generate_daily_summary("child-001", "2026-03-01")

        assert result is None

    # ─── Helpers ──────────────────────────────────────────

    def test_hour_to_period_morning(self):
        assert "am" in _hour_to_period(9)

    def test_hour_to_period_afternoon(self):
        assert "pm" in _hour_to_period(14)

    def test_hour_to_period_evening(self):
        assert "evening" in _hour_to_period(18)

    def test_hour_to_period_night(self):
        assert "night" in _hour_to_period(21)
