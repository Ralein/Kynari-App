"""Tests for the baby need detection ML pipeline."""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta


# ─── Audio Analyzer Tests ───────────────────────────────────


class TestAudioAnalyzer:
    """Tests for ml/audio_analyzer.py need classification."""

    def test_cry_to_need_mapping(self):
        """CRY_TO_NEED_MAP should map all model outputs to valid need labels."""
        from ml.audio_analyzer import CRY_TO_NEED_MAP, NEED_LABELS

        for cry_label, need_label in CRY_TO_NEED_MAP.items():
            assert need_label in NEED_LABELS, f"{cry_label} maps to invalid need: {need_label}"

    def test_need_labels_complete(self):
        """NEED_LABELS should contain exactly 5 labels."""
        from ml.audio_analyzer import NEED_LABELS
        assert NEED_LABELS == ["hungry", "diaper", "sleepy", "pain", "calm"]

    def test_need_descriptions_cover_all(self):
        """Every need label should have a description."""
        from ml.audio_analyzer import NEED_LABELS, NEED_DESCRIPTIONS
        for label in NEED_LABELS:
            assert label in NEED_DESCRIPTIONS, f"Missing description for: {label}"

    def test_short_audio_returns_error(self):
        """Audio shorter than 0.5s should return error."""
        from ml.audio_analyzer import analyze_audio_bytes
        # Send essentially empty audio (very short)
        short_audio = b"\x00" * 100
        result = analyze_audio_bytes(short_audio, filename="short.wav")
        assert result["success"] is False

    @patch("ml.audio_analyzer._load_cry_classifier")
    def test_analyze_returns_need_labels(self, mock_classifier):
        """Analyze should return need labels, not emotion labels."""
        import numpy as np

        mock_classifier.return_value = MagicMock(return_value=[
            {"label": "hungry", "score": 0.6},
            {"label": "tired", "score": 0.2},
            {"label": "belly_pain", "score": 0.1},
            {"label": "discomfort", "score": 0.05},
            {"label": "burping", "score": 0.05},
        ])

        with patch("ml.audio_analyzer.librosa") as mock_lib:
            mock_lib.load.return_value = (np.zeros(16000), 16000)
            mock_lib.feature.melspectrogram.return_value = np.zeros((128, 100))
            mock_lib.power_to_db.return_value = np.zeros((128, 100))
            mock_lib.feature.zero_crossing_rate.return_value = np.array([[0.05]])
            mock_lib.piptrack.return_value = (np.zeros((100, 100)), np.zeros((100, 100)))

            from ml.audio_analyzer import analyze_audio_file

            with patch("ml.audio_analyzer.generate_spectrogram_b64", return_value=None):
                result = analyze_audio_file("/fake/path.wav")

        assert result["success"] is True
        assert result["need_label"] in ["hungry", "diaper", "sleepy", "pain", "calm"]
        assert "all_needs" in result
        assert "audio_features" in result
        # Should NOT have emotion_label
        assert "emotion_label" not in result


# ─── Face Analyzer Tests ────────────────────────────────────


class TestFaceAnalyzer:
    """Tests for ml/face_analyzer.py ML-based distress + need detection."""

    def test_blendshape_extraction(self):
        """_extract_blendshapes should convert raw MediaPipe blendshapes to dict."""
        from ml.face_analyzer import _extract_blendshapes

        class FakeBS:
            def __init__(self, name, score):
                self.category_name = name
                self.score = score

        raw = [
            FakeBS("_neutral", 0.9),
            FakeBS("browDownLeft", 0.7),
            FakeBS("jawOpen", 0.5),
            FakeBS("mouthSmileLeft", 0.1),
        ]
        result = _extract_blendshapes(raw)
        # Should skip _neutral
        assert "_neutral" not in result
        assert result["browDownLeft"] == 0.7
        assert result["jawOpen"] == 0.5
        assert result["mouthSmileLeft"] == 0.1

    def test_distress_from_blendshapes_range(self):
        """Distress score from blendshapes should be 0–1."""
        from ml.face_analyzer import _compute_distress_from_blendshapes

        # All zeros → low distress
        calm = {
            "browDownLeft": 0.0, "browDownRight": 0.0, "browInnerUp": 0.0,
            "eyeSquintLeft": 0.0, "eyeSquintRight": 0.0,
            "jawOpen": 0.0, "mouthFrownLeft": 0.0,
            "mouthSmileLeft": 0.0,
        }
        score_calm = _compute_distress_from_blendshapes(calm)
        assert 0.0 <= score_calm <= 1.0

        # High distress signals (realistic MediaPipe values: 0.2–0.5)
        distressed = {
            "browDownLeft": 0.4, "browDownRight": 0.4,
            "eyeSquintLeft": 0.45, "eyeSquintRight": 0.45,
            "jawOpen": 0.35, "mouthStretchLeft": 0.5, "mouthStretchRight": 0.5,
            "mouthFrownLeft": 0.4, "mouthFrownRight": 0.4,
            "noseSneerLeft": 0.3, "noseSneerRight": 0.3,
        }
        score_distress = _compute_distress_from_blendshapes(distressed)
        assert 0.0 <= score_distress <= 1.0
        assert score_distress > score_calm, "Distressed face should score higher"

    def test_need_prediction_returns_valid_labels(self):
        """Need prediction should return valid need labels and sum to ~1."""
        from ml.face_analyzer import _predict_need_from_face, NEED_LABELS

        blendshapes = {
            "eyeSquintLeft": 0.8, "eyeSquintRight": 0.8,
            "browDownLeft": 0.7, "browDownRight": 0.7,
            "mouthStretchLeft": 0.9, "mouthStretchRight": 0.9,
            "noseSneerLeft": 0.6, "noseSneerRight": 0.6,
            "jawOpen": 0.7,
        }
        result = _predict_need_from_face(blendshapes, 0.8, None)

        assert result["need_label"] in NEED_LABELS
        assert 0.0 <= result["confidence"] <= 1.0
        assert set(result["all_needs"].keys()) == set(NEED_LABELS)
        total = sum(result["all_needs"].values())
        assert 0.95 <= total <= 1.05, f"Need scores should sum to ~1, got {total}"

    def test_expression_distress_mapping(self):
        """Expression labels should map to valid distress values."""
        from ml.face_analyzer import EXPRESSION_DISTRESS

        for label, score in EXPRESSION_DISTRESS.items():
            assert 0.0 <= score <= 1.0, f"{label} distress out of range: {score}"
        assert EXPRESSION_DISTRESS["happy"] < EXPRESSION_DISTRESS["sad"]
        assert EXPRESSION_DISTRESS["neutral"] < EXPRESSION_DISTRESS["angry"]

    def test_decode_image_from_bytes(self):
        """decode_image should handle raw bytes."""
        from ml.face_analyzer import decode_image
        from PIL import Image
        import io

        img = Image.new("RGB", (100, 100), color="red")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        decoded = decode_image(raw_bytes)
        assert decoded.size == (100, 100)


# ─── Multimodal Fusion Tests ────────────────────────────────


class TestMultimodalFusion:
    """Tests for ml/multimodal_analyzer.py fusion logic."""

    def test_fuse_audio_only(self):
        """Fusion with only audio should weight audio 85%, context 15%."""
        from ml.multimodal_analyzer import fuse_predictions

        audio = {
            "success": True,
            "need_label": "hungry",
            "confidence": 0.8,
            "all_needs": {"hungry": 0.8, "diaper": 0.1, "sleepy": 0.05, "pain": 0.03, "calm": 0.02},
            "audio_features": {"duration_seconds": 3.0},
        }

        result = fuse_predictions(audio, None, None)
        assert result["success"] is True
        assert result["need_label"] == "hungry"
        assert result["fusion_weights"]["audio"] == 0.85
        assert result["fusion_weights"]["face"] == 0.0

    def test_fuse_with_context(self):
        """Context should boost relevant needs when time thresholds are met."""
        from ml.multimodal_analyzer import compute_context_scores

        # Baby hasn't eaten in 5 hours
        context = {
            "last_feed_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
            "last_diaper_at": datetime.now(timezone.utc).isoformat(),
            "last_nap_at": datetime.now(timezone.utc).isoformat(),
        }

        scores = compute_context_scores(context)
        assert scores["hungry"] > scores["diaper"]
        assert scores["hungry"] > scores["sleepy"]

    def test_fuse_no_signals(self):
        """With no audio or face, should fall back to context-only."""
        from ml.multimodal_analyzer import fuse_predictions

        result = fuse_predictions(None, None, None)
        assert result["success"] is True
        assert result["modality"] == "context_only"
        assert "warning" in result

    def test_fuse_combined(self):
        """Full fusion with audio + face + context should use 70/15/15 weights."""
        from ml.multimodal_analyzer import fuse_predictions

        audio = {
            "success": True,
            "need_label": "hungry",
            "confidence": 0.8,
            "all_needs": {"hungry": 0.8, "diaper": 0.1, "sleepy": 0.05, "pain": 0.03, "calm": 0.02},
        }
        face = {
            "success": True,
            "distress_score": 0.7,
            "distress_intensity": "high",
            "stress_features": {"mouth_openness": 0.8, "eye_squint": 0.6, "brow_tension": 0.5},
        }

        result = fuse_predictions(audio, face, None)
        assert result["success"] is True
        assert result["modality"] == "combined"
        assert result["fusion_weights"]["audio"] == 0.70
        assert result["fusion_weights"]["face"] == 0.15
        assert result["fusion_weights"]["context"] == 0.15


# ─── Feedback Store Tests ───────────────────────────────────


class TestFeedbackStore:
    """Tests for ml/feedback_store.py."""

    def test_invalid_label_rejected(self):
        """Storing a correction with invalid label should fail."""
        from ml.feedback_store import FeedbackStore

        store = FeedbackStore()

        with patch("ml.feedback_store.get_pool"):
            result = store.store_correction(
                event_id="evt-1",
                child_id="child-1",
                original_label="hungry",
                corrected_label="invalid_need",
                parent_id="parent-1",
            )
            assert result["success"] is False
            assert "invalid_label" in result.get("error", "")

    def test_empty_accuracy_stats(self):
        """Empty feedback should return no-data message."""
        from ml.feedback_store import FeedbackStore

        store = FeedbackStore()

        with patch("ml.feedback_store.fetch_all", return_value=[]):
            stats = store.get_accuracy_stats("child-1")
            assert stats["total_feedback"] == 0
            assert stats["accuracy_rate"] is None
