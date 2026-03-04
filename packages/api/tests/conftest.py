"""Shared test fixtures."""

import pytest
from unittest.mock import patch
from datetime import datetime, date, timezone, timedelta
from fastapi.testclient import TestClient


# ─── Auth & Client Fixtures ─────────────────────────────────


@pytest.fixture
def mock_auth():
    """Mock the auth dependency to bypass JWT verification."""
    return {"user_id": "parent-001", "email": "test@kynari.app", "role": "authenticated"}


@pytest.fixture
def client(mock_auth):
    """Create a test client with mocked auth."""
    from middleware.auth import get_current_user
    from main import app

    app.dependency_overrides[get_current_user] = lambda: mock_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ─── Mock Database ───────────────────────────────────────────


class MockCursor:
    """Mock psycopg cursor with dict_row behaviour."""

    def __init__(self, data=None):
        self._data = data or []
        self._idx = 0

    def execute(self, sql, params=None):
        pass

    def fetchone(self):
        if self._data and isinstance(self._data, list) and len(self._data) > 0:
            if isinstance(self._data[0], dict):
                return self._data[0]
        return self._data if isinstance(self._data, dict) else None

    def fetchall(self):
        if isinstance(self._data, list):
            return self._data
        return [self._data] if self._data else []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class MockConnection:
    """Mock psycopg connection."""

    def __init__(self, data=None):
        self._data = data

    def cursor(self):
        return MockCursor(self._data)

    def commit(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


class MockPool:
    """Mock psycopg connection pool."""

    def __init__(self):
        self._table_data: dict[str, list] = {}
        self._default_data = []

    def set_data(self, data):
        self._default_data = data

    def connection(self):
        return MockConnection(self._default_data)


@pytest.fixture
def mock_pool():
    """Create a mock database pool."""
    pool = MockPool()
    with patch("database.get_pool", return_value=pool):
        yield pool


@pytest.fixture
def mock_db_functions():
    """Mock all database query helper functions for isolated unit tests."""
    with patch("database.fetch_one") as mock_fetch_one, \
         patch("database.fetch_all") as mock_fetch_all, \
         patch("database.execute") as mock_execute, \
         patch("database.execute_returning") as mock_execute_returning, \
         patch("database.execute_returning_all") as mock_execute_returning_all, \
         patch("database.get_pool") as mock_get_pool:

        mock_get_pool.return_value = MockPool()

        yield {
            "fetch_one": mock_fetch_one,
            "fetch_all": mock_fetch_all,
            "execute": mock_execute,
            "execute_returning": mock_execute_returning,
            "execute_returning_all": mock_execute_returning_all,
            "get_pool": mock_get_pool,
        }


@pytest.fixture
def sample_child():
    """A sample child record."""
    return {
        "id": "child-001",
        "parent_id": "parent-001",
        "name": "Luna",
        "date_of_birth": "2023-06-15",
        "created_at": "2025-01-01T00:00:00Z",
        "avatar_url": None,
    }


@pytest.fixture
def sample_events():
    """A set of sample emotion events for testing."""
    base_time = datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc)
    events = []

    # Simulate a day with varied emotions
    emotions_conf = [
        ("happy", 0.9), ("happy", 0.85), ("happy", 0.8),
        ("neutral", 0.7), ("neutral", 0.65),
        ("frustrated", 0.75), ("frustrated", 0.8),
        ("sad", 0.6),
        ("angry", 0.7),
        ("happy", 0.88),
    ]

    for i, (emotion, conf) in enumerate(emotions_conf):
        events.append({
            "id": f"event-{i:03d}",
            "child_id": "child-001",
            "session_id": "session-001",
            "emotion_label": emotion,
            "confidence": conf,
            "modality": "voice",
            "timestamp": (base_time + timedelta(minutes=i * 15)).isoformat(),
            "created_at": (base_time + timedelta(minutes=i * 15)).isoformat(),
        })

    return events


@pytest.fixture
def sample_events_multiday():
    """Events spread over 10 days for baseline testing."""
    events = []
    base_date = date(2026, 2, 20)

    emotion_patterns = {
        "happy": 4,
        "neutral": 3,
        "frustrated": 2,
        "sad": 1,
    }

    for day_offset in range(10):
        current_date = base_date + timedelta(days=day_offset)
        event_idx = 0
        for emotion, count in emotion_patterns.items():
            for j in range(count):
                events.append({
                    "id": f"event-d{day_offset}-{event_idx}",
                    "child_id": "child-001",
                    "session_id": f"session-d{day_offset}",
                    "emotion_label": emotion,
                    "confidence": 0.8,
                    "modality": "voice",
                    "timestamp": f"{current_date.isoformat()}T{10 + event_idx}:00:00+00:00",
                    "created_at": f"{current_date.isoformat()}T{10 + event_idx}:00:00+00:00",
                })
                event_idx += 1

    return events


@pytest.fixture
def sample_daily_summaries():
    """A week of daily summaries."""
    base_date = date(2026, 2, 24)
    summaries = []

    patterns = [
        ("happy", {"happy": 40, "neutral": 30, "sad": 10, "frustrated": 10, "angry": 5, "fearful": 5}),
        ("happy", {"happy": 45, "neutral": 25, "sad": 10, "frustrated": 10, "angry": 5, "fearful": 5}),
        ("neutral", {"happy": 20, "neutral": 40, "sad": 15, "frustrated": 15, "angry": 5, "fearful": 5}),
        ("frustrated", {"happy": 15, "neutral": 20, "sad": 10, "frustrated": 35, "angry": 15, "fearful": 5}),
        ("happy", {"happy": 50, "neutral": 25, "sad": 5, "frustrated": 10, "angry": 5, "fearful": 5}),
        ("happy", {"happy": 35, "neutral": 30, "sad": 10, "frustrated": 15, "angry": 5, "fearful": 5}),
        ("frustrated", {"happy": 10, "neutral": 20, "sad": 15, "frustrated": 40, "angry": 10, "fearful": 5}),
    ]

    for i, (dominant, dist) in enumerate(patterns):
        current_date = base_date + timedelta(days=i)
        summaries.append({
            "id": f"summary-{i:03d}",
            "child_id": "child-001",
            "date": current_date.isoformat(),
            "dominant_emotion": dominant,
            "emotion_distribution": dist,
            "total_events": 20,
            "baseline_deviation": None,
            "insight_text": f"Test insight for {current_date.isoformat()}",
        })

    return summaries
