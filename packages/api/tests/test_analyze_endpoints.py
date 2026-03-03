"""Tests for analyze endpoints: save, combined, and error handling."""

import io
import json
import pytest
from unittest.mock import patch, MagicMock


class TestSaveEndpoint:
    """Test /api/analyze/save resilience and happy path."""

    def test_save_returns_success_without_db(self, client):
        """Save should return success with IDs even if the database pool is unreachable."""
        with patch("routers.analyze.get_pool", side_effect=Exception("DB pool unavailable")):
            # need_baseline_engine.ingest_events is called inside the try block,
            # but we're raising before that, so it won't be reached.
            response = client.post("/api/analyze/save", json={
                "child_id": "child-001",
                "need_label": "hungry",
                "confidence": 0.85,
                "modality": "voice",
            })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "event_id" in data
        assert "session_id" in data
        # UUIDs should be 36 chars
        assert len(data["event_id"]) == 36
        assert len(data["session_id"]) == 36

    def test_save_happy_path(self, client, mock_pool):
        """Save should insert into DB and return success."""
        with patch("routers.analyze.get_pool", return_value=mock_pool), \
             patch("services.baseline_engine.need_baseline_engine") as mock_baseline:
            mock_baseline.ingest_events = MagicMock()

            response = client.post("/api/analyze/save", json={
                "child_id": "child-001",
                "need_label": "pain",
                "confidence": 0.72,
                "modality": "combined",
                "secondary_need": "hungry",
                "all_needs": {"hungry": 0.2, "pain": 0.5, "calm": 0.1, "sleepy": 0.1, "diaper": 0.1},
            })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_save_validates_required_fields(self, client):
        """Save should reject requests missing required fields."""
        response = client.post("/api/analyze/save", json={
            "child_id": "child-001",
            # missing need_label, confidence, modality
        })

        assert response.status_code == 422  # Pydantic validation error


class TestCombinedEndpoint:
    """Test /api/analyze/combined multimodal fusion endpoint."""

    def test_combined_fuses_audio_and_face(self, client):
        """Combined endpoint should run audio analysis and fuse with face data."""
        mock_audio_result = {
            "success": True,
            "modality": "voice",
            "need_label": "hungry",
            "confidence": 0.78,
            "all_needs": {"hungry": 0.78, "pain": 0.1, "sleepy": 0.05, "diaper": 0.05, "calm": 0.02},
            "audio_features": {"pitch_mean": 440.0},
        }
        mock_fused_result = {
            "success": True,
            "modality": "combined",
            "need_label": "hungry",
            "confidence": 0.82,
            "need_description": "Baby may be hungry",
            "secondary_need": "pain",
            "all_needs": {"hungry": 0.82, "pain": 0.08, "sleepy": 0.04, "diaper": 0.04, "calm": 0.02},
            "fusion_weights": {"audio": 0.70, "face": 0.15, "context": 0.15},
        }

        # Create a minimal audio file (WAV header)
        audio_content = b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + \
                        (16).to_bytes(4, "little") + (1).to_bytes(2, "little") + \
                        (1).to_bytes(2, "little") + (16000).to_bytes(4, "little") + \
                        (32000).to_bytes(4, "little") + (2).to_bytes(2, "little") + \
                        (16).to_bytes(2, "little") + b"data" + (0).to_bytes(4, "little")

        with patch("routers.analyze.analyze_audio_bytes", return_value=mock_audio_result) as mock_audio, \
             patch("routers.analyze.fuse_predictions", return_value=mock_fused_result) as mock_fuse:

            # Need to patch at module level since they're imported inside the function
            with patch("ml.audio_analyzer.analyze_audio_bytes", return_value=mock_audio_result), \
                 patch("ml.multimodal_analyzer.fuse_predictions", return_value=mock_fused_result):

                response = client.post(
                    "/api/analyze/combined",
                    files={"file": ("recording.wav", io.BytesIO(audio_content), "audio/wav")},
                    data={
                        "face_distress_score": "0.65",
                        "face_distress_intensity": "moderate",
                        "face_stress_features": json.dumps({"mouthOpen": 0.7, "browDown": 0.5}),
                    },
                )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_combined_rejects_wrong_content_type(self, client):
        """Combined endpoint should reject non-audio files."""
        image_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100

        response = client.post(
            "/api/analyze/combined",
            files={"file": ("photo.png", io.BytesIO(image_content), "image/png")},
            data={
                "face_distress_score": "0.5",
                "face_distress_intensity": "mild",
            },
        )

        assert response.status_code == 400
        data = response.json()
        assert "Invalid audio type" in data["detail"]


class TestAudioEndpoint:
    """Test /api/analyze/audio error resilience."""

    def test_audio_rejects_wrong_content_type(self, client):
        """Audio endpoint should reject non-audio files."""
        response = client.post(
            "/api/analyze/audio",
            files={"file": ("photo.jpg", io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 100), "image/jpeg")},
        )

        assert response.status_code == 400

    def test_audio_returns_graceful_error_on_model_failure(self, client):
        """Audio endpoint should return success=false, not 500, when model fails."""
        audio_content = b"RIFF" + (36).to_bytes(4, "little") + b"WAVEfmt " + \
                        (16).to_bytes(4, "little") + (1).to_bytes(2, "little") + \
                        (1).to_bytes(2, "little") + (16000).to_bytes(4, "little") + \
                        (32000).to_bytes(4, "little") + (2).to_bytes(2, "little") + \
                        (16).to_bytes(2, "little") + b"data" + (0).to_bytes(4, "little")

        with patch("ml.audio_analyzer.analyze_audio_bytes", side_effect=RuntimeError("Model not loaded")):
            response = client.post(
                "/api/analyze/audio",
                files={"file": ("recording.wav", io.BytesIO(audio_content), "audio/wav")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "model_unavailable"
