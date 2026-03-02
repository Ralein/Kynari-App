"""Tests for API endpoints."""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Test the health and root endpoints (no auth required)."""

    def test_health(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_root(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Kynari API"
        assert "docs" in data


class TestChildrenEndpoints:
    """Test children CRUD endpoints."""

    def test_list_children(self, client, mock_db, sample_child):
        mock_db.set_table_data("children", [sample_child])

        with patch("routers.children.get_supabase", return_value=mock_db):
            response = client.get("/children/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_create_child(self, client, mock_db, sample_child):
        # Mock must return all fields expected by ChildResponse
        mock_db.set_table_data("children", [sample_child])

        with patch("routers.children.get_supabase", return_value=mock_db):
            response = client.post("/children/", json={
                "name": "Luna",
                "date_of_birth": "2023-06-15",
            })

        assert response.status_code == 201


class TestEventsEndpoints:
    """Test events batch and query endpoints."""

    def test_get_events_by_date(self, client, mock_db, sample_child, sample_events):
        mock_db.set_table_data("children", [sample_child])
        mock_db.set_table_data("emotion_events", sample_events)

        with patch("routers.events.get_supabase", return_value=mock_db):
            response = client.get("/events/child-001?date=2026-03-01")

        assert response.status_code == 200


class TestSummariesEndpoints:
    """Test summary endpoints."""

    def test_baseline_status_no_data(self, client, mock_db, sample_child):
        mock_db.set_table_data("children", [sample_child])
        mock_db.set_table_data("child_baselines", [])

        with patch("routers.summaries.get_supabase", return_value=mock_db):
            response = client.get("/summaries/child-001/baseline-status")

        assert response.status_code == 200
        data = response.json()
        assert data["calibration_complete"] is False
        assert data["days_of_data"] == 0
        assert data["days_remaining"] == 7

    def test_patterns_no_data(self, client, mock_db, sample_child):
        mock_db.set_table_data("children", [sample_child])
        mock_db.set_table_data("daily_summaries", [])

        with patch("routers.summaries.get_supabase", return_value=mock_db):
            response = client.get("/summaries/child-001/patterns")

        assert response.status_code == 200
        data = response.json()
        assert data["days_with_data"] == 0
