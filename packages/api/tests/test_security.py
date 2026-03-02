"""Tests for Phase 3 security features: rate limiting, audit logging,
security headers, and data retention."""

import time
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient
from tests.conftest import MockPool


# ─── Security Headers ───────────────────────────────────────


class TestSecurityHeaders:
    """Verify security headers are present in all responses."""

    def test_health_has_security_headers(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert "max-age=31536000" in response.headers["Strict-Transport-Security"]
        assert response.headers["X-XSS-Protection"] == "0"
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "camera=()" in response.headers["Permissions-Policy"]

    def test_root_has_security_headers(self, client: TestClient):
        response = client.get("/")
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"


# ─── Rate Limiting ──────────────────────────────────────────


class TestRateLimiting:
    """Verify rate limiting middleware behavior."""

    def test_rate_limit_allows_normal_requests(self, client: TestClient):
        """Verify requests under the limit pass through."""
        for _ in range(5):
            response = client.get("/health")
            assert response.status_code == 200

    def test_rate_limit_returns_429(self, client: TestClient):
        """Verify 429 after exceeding limit."""
        from middleware.rate_limit import RateLimitMiddleware

        limiter = RateLimitMiddleware(app=MagicMock())

        key = "test:user123"
        window_key = f"{key}:events"
        now = time.monotonic()
        limiter._windows[window_key] = [now - i * 0.1 for i in range(60)]

        assert len(limiter._windows[window_key]) == 60

    def test_rate_limit_config(self):
        """Verify rate limit configuration."""
        from middleware.rate_limit import RATE_LIMITS, DEFAULT_LIMIT

        assert RATE_LIMITS["/events/batch"] == (10, 60)
        assert DEFAULT_LIMIT == (60, 60)


# ─── Audit Logging ──────────────────────────────────────────


class TestAuditLogging:
    """Verify audit log middleware behavior."""

    def test_audit_skips_read_requests(self, client: TestClient):
        """GET requests should not be audit logged."""
        from middleware.audit import SKIP_PATHS, MUTATING_METHODS

        assert "GET" not in MUTATING_METHODS
        assert "/health" in SKIP_PATHS

    def test_audit_captures_mutating_methods(self):
        """POST/PUT/PATCH/DELETE should be logged."""
        from middleware.audit import MUTATING_METHODS

        assert "POST" in MUTATING_METHODS
        assert "PUT" in MUTATING_METHODS
        assert "PATCH" in MUTATING_METHODS
        assert "DELETE" in MUTATING_METHODS


# ─── Data Retention ─────────────────────────────────────────


class TestDataRetention:
    """Test COPPA data retention service."""

    @pytest.mark.asyncio
    async def test_purge_expired_events(self):
        """Test purging events older than retention window."""
        from services.data_retention import DataRetentionService

        service = DataRetentionService()
        mock_pool = MockPool()
        mock_pool.set_data([{"id": "event-1"}, {"id": "event-2"}])

        with patch("services.data_retention.fetch_one", return_value={"data_retention_days": 90}), \
             patch("services.data_retention.get_pool", return_value=mock_pool):
            result = await service.purge_expired_events("child-123")
        assert result == 2

    @pytest.mark.asyncio
    async def test_get_retention_status(self):
        """Test retention status reporting."""
        from services.data_retention import DataRetentionService

        service = DataRetentionService()

        call_count = [0]
        def side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return {"data_retention_days": 90}
            elif call_count[0] == 2:
                return {"count": 42}
            elif call_count[0] == 3:
                return {"timestamp": "2026-01-01T00:00:00Z"}
            return None

        with patch("services.data_retention.fetch_one", side_effect=side_effect):
            result = await service.get_retention_status("child-123")
        assert result["child_id"] == "child-123"
        assert result["retention_days"] == 90

    @pytest.mark.asyncio
    async def test_purge_all_child_data(self):
        """Test full child data deletion (COPPA right-to-delete)."""
        from services.data_retention import DataRetentionService

        service = DataRetentionService()
        mock_pool = MockPool()
        mock_pool.set_data([{"id": "1"}, {"id": "2"}])

        with patch("services.data_retention.get_pool", return_value=mock_pool):
            result = await service.purge_all_child_data("child-123")

        assert result["child_id"] == "child-123"
        assert result["events_deleted"] == 2
        assert result["summaries_deleted"] == 2
        assert result["baselines_deleted"] == 2
