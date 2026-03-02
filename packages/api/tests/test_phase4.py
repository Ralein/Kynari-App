"""Tests for Phase 4: AI reports and tier system."""

from datetime import date
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient


# ─── AI Report Service ──────────────────────────────────────


class TestAIReportService:
    """Test the AI report narrative generation."""

    @pytest.mark.asyncio
    async def test_generate_fallback_with_data(self):
        """Test fallback narrative generation (no API key)."""
        from services.ai_report import AIReportService

        service = AIReportService()
        summaries = [
            {"dominant_emotion": "happy", "total_events": 20, "date": "2026-02-24"},
            {"dominant_emotion": "happy", "total_events": 15, "date": "2026-02-25"},
            {"dominant_emotion": "frustrated", "total_events": 18, "date": "2026-02-26"},
        ]

        result = service._generate_fallback("Luna", summaries)
        assert "Luna" in result
        assert "happy" in result
        assert "53" in result  # 20+15+18 total events
        assert "3 days" in result

    @pytest.mark.asyncio
    async def test_generate_fallback_no_data(self):
        """Test fallback with empty summaries."""
        from services.ai_report import AIReportService

        service = AIReportService()
        result = service._generate_fallback("Luna", [])
        assert "No data" in result
        assert "Luna" in result

    @pytest.mark.asyncio
    async def test_generate_weekly_stores_report(self):
        """Test that generate_weekly_narrative stores the report."""
        from services.ai_report import AIReportService

        service = AIReportService()
        mock_db = MagicMock()

        # Mock child name lookup
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"name": "Luna"}
        )
        # Mock daily summaries fetch (empty = triggers fallback)
        mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )
        # Mock upsert
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[{}])

        with patch("services.ai_report.get_supabase", return_value=mock_db):
            result = await service.generate_weekly_narrative("child-001", date(2026, 2, 24))

        assert "Luna" in result
        # Verify upsert was called (report stored)
        mock_db.table.return_value.upsert.assert_called()

    @pytest.mark.asyncio
    async def test_get_weekly_report(self):
        """Test retrieving a stored report."""
        from services.ai_report import AIReportService

        service = AIReportService()
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"narrative": "A great week!", "created_at": "2026-02-28T00:00:00Z"}
        )

        with patch("services.ai_report.get_supabase", return_value=mock_db):
            result = await service.get_weekly_report("child-001", date(2026, 2, 24))

        assert result["narrative"] == "A great week!"

    @pytest.mark.asyncio
    async def test_claude_api_error_falls_back(self):
        """Test that Claude API errors fall back to template."""
        from services.ai_report import AIReportService

        service = AIReportService()
        summaries = [
            {"dominant_emotion": "happy", "total_events": 10, "date": "2026-02-24",
             "emotion_distribution": {"happy": 60, "sad": 20, "neutral": 20},
             "insight_text": "A happy day"},
        ]

        with patch("anthropic.Anthropic", side_effect=Exception("API down")):
            result = await service._call_claude("Luna", date(2026, 2, 24), summaries, "fake-key")

        assert "Luna" in result


# ─── Tier Guard ─────────────────────────────────────────────


class TestTierGuard:
    """Test tier guard middleware."""

    def test_tier_guard_config_exists(self):
        """Verify tier guard module loads correctly."""
        from middleware.tier_guard import require_pro_tier
        assert callable(require_pro_tier)


# ─── AI Report Endpoint ─────────────────────────────────────


class TestAIReportEndpoint:
    """Test the AI report API endpoint."""

    def test_ai_report_endpoint_exists(self, client: TestClient):
        """Verify the ai-report route is registered."""
        # This should return 404 (child not found) rather than 405 (method not allowed)
        with patch("routers.summaries.get_supabase") as mock_db:
            mock_db.return_value.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
                data=None
            )
            response = client.get("/summaries/fake-child/ai-report")
            # 404 = route exists but child not found (correct behavior)
            assert response.status_code == 404
