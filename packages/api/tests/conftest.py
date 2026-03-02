"""Shared test fixtures."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, date, timezone, timedelta


# ─── Mock Supabase Client ────────────────────────────────────

class MockTable:
    """Mock Supabase table with chainable query builder."""

    def __init__(self, data=None):
        self._data = data or []
        self._response = MagicMock()
        self._response.data = self._data

    def select(self, *args):
        return self

    def insert(self, data):
        if isinstance(data, list):
            self._response.data = data
        else:
            self._response.data = [data]
        return self

    def upsert(self, data, **kwargs):
        self._response.data = [data]
        return self

    def update(self, data):
        self._response.data = [data]
        return self

    def delete(self):
        return self

    def eq(self, *args):
        return self

    def gte(self, *args):
        return self

    def lt(self, *args):
        return self

    def lte(self, *args):
        return self

    def order(self, *args):
        return self

    def single(self):
        if self._data:
            self._response.data = self._data[0]
        else:
            self._response.data = None
        return self

    def execute(self):
        return self._response


class MockSupabase:
    """Mock Supabase client."""

    def __init__(self):
        self._tables: dict[str, MockTable] = {}

    def set_table_data(self, table_name: str, data: list):
        self._tables[table_name] = MockTable(data)

    def table(self, name: str):
        return self._tables.get(name, MockTable([]))


@pytest.fixture
def mock_db():
    """Create a mock Supabase client."""
    return MockSupabase()


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
