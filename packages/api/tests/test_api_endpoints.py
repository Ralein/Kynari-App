"""Tests for API endpoints."""

from unittest.mock import patch


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

    def test_list_children(self, client, sample_child):
        with patch("routers.children.fetch_all", return_value=[sample_child]):
            response = client.get("/children/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_create_child(self, client, sample_child):
        with patch("routers.children.execute_returning", return_value=sample_child):
            response = client.post("/children/", json={
                "name": "Luna",
                "date_of_birth": "2023-06-15",
            })

        assert response.status_code == 201


class TestEventsEndpoints:
    """Test events batch and query endpoints."""

    def test_get_events_by_date(self, client, sample_child, sample_events):
        with patch("routers.events.fetch_one", return_value=sample_child), \
             patch("routers.events.fetch_all", return_value=sample_events):
            response = client.get("/events/child-001?date=2026-03-01")

        assert response.status_code == 200


class TestSummariesEndpoints:
    """Test summary endpoints."""

    def test_baseline_status_no_data(self, client, sample_child):
        with patch("routers.summaries.fetch_one", return_value=sample_child), \
             patch("routers.summaries.fetch_all", return_value=[]):
            response = client.get("/summaries/child-001/baseline-status")

        assert response.status_code == 200
        data = response.json()
        assert data["calibration_complete"] is False
        assert data["days_of_data"] == 0
        assert data["days_remaining"] == 7

    def test_patterns_no_data(self, client, sample_child):
        with patch("routers.summaries.fetch_one", return_value=sample_child), \
             patch("routers.summaries.fetch_all", return_value=[]):
            response = client.get("/summaries/child-001/patterns")

        assert response.status_code == 200
        data = response.json()
        assert data["days_with_data"] == 0
