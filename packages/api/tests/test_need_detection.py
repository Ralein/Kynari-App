"""Tests for the baby need detection ML pipeline."""

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

    def test_cry_detection_gate(self):
        """Cry detection should classify audio types correctly."""
        import numpy as np
        from ml.audio_analyzer import detect_crying

        # Silence → not crying
        silence = np.zeros(16000)  # 1 second of silence at 16kHz
        result = detect_crying(silence, 16000)
        assert result["is_crying"] is False
        assert result["audio_type"] == "silence"

    def test_ensemble_confidence_adaptive_weights(self):
        """Ensemble should adapt weights based on model confidence."""
        from ml.audio_analyzer import ensemble_scores

        # High confidence model → 85/15
        high_conf_model = {"hungry": 0.7, "pain": 0.1, "sleepy": 0.05, "diaper": 0.1, "calm": 0.05}
        heuristic = {"hungry": 0.3, "pain": 0.2, "sleepy": 0.2, "diaper": 0.15, "calm": 0.15}
        result = ensemble_scores(high_conf_model, heuristic)
        assert result["hungry"] > result["pain"]  # Model's top pick should dominate

        # Low confidence model → 50/50
        low_conf_model = {"hungry": 0.25, "pain": 0.20, "sleepy": 0.20, "diaper": 0.20, "calm": 0.15}
        result_low = ensemble_scores(low_conf_model, heuristic)
        # With 50/50, the result should be closer to the average
        assert result_low["hungry"] < result["hungry"]  # Less model dominance

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
            # Create audio with enough energy to pass cry detection gate
            y = np.random.randn(16000).astype(np.float32) * 0.05
            mock_lib.load.return_value = (y, 16000)
            mock_lib.feature.melspectrogram.return_value = np.zeros((128, 100))
            mock_lib.power_to_db.return_value = np.zeros((128, 100))
            mock_lib.feature.zero_crossing_rate.return_value = np.array([[0.05]])
            mock_lib.feature.rms.return_value = np.array([[0.04]])
            mock_lib.piptrack.return_value = (np.ones((100, 100)) * 400, np.ones((100, 100)) * 0.5)
            mock_lib.feature.spectral_centroid.return_value = np.array([[2000.0]])
            mock_lib.feature.spectral_rolloff.return_value = np.array([[4000.0]])
            mock_lib.feature.spectral_bandwidth.return_value = np.array([[1500.0]])
            mock_lib.feature.spectral_contrast.return_value = np.zeros((7, 100))
            mock_lib.feature.mfcc.return_value = np.zeros((13, 100))
            mock_lib.feature.delta.return_value = np.zeros((13, 100))
            mock_lib.onset.onset_strength.return_value = np.zeros(100)

            from ml.audio_analyzer import analyze_audio_file

            with patch("ml.audio_analyzer.generate_spectrogram_b64", return_value=None):
                with patch("ml.audio_analyzer.detect_crying", return_value={"is_crying": True, "cry_confidence": 0.8, "audio_type": "crying"}):
                    result = analyze_audio_file("/fake/path.wav")

        assert result["success"] is True
        assert result["need_label"] in ["hungry", "diaper", "sleepy", "pain", "calm"]
        assert "all_needs" in result
        assert "audio_features" in result
        assert "cry_detection" in result
        # Should NOT have emotion_label
        assert "emotion_label" not in result


# ─── Face Analyzer Tests ────────────────────────────────────


class TestFaceAnalyzer:
    """Tests for ml/face_analyzer.py MediaPipe-based distress + need detection."""

    def test_geometric_feature_extraction(self):
        """_extract_geometric_features should return valid feature dict from landmarks."""
        import numpy as np
        from ml.face_analyzer import _extract_geometric_features

        # Create a mock 468-point face with approximate positions
        pts = np.random.rand(468, 3) * 200 + 50  # Random points in [50, 250]
        # Set key reference points far enough apart for valid face
        pts[10] = [150, 30, 0]   # FACE_TOP
        pts[152] = [150, 250, 0]  # FACE_BOTTOM
        pts[234] = [30, 140, 0]   # FACE_LEFT
        pts[454] = [270, 140, 0]  # FACE_RIGHT

        result = _extract_geometric_features(pts)
        assert len(result) > 0
        # All values should be in [0, 1]
        for feat_name, value in result.items():
            assert 0.0 <= value <= 1.0, f"{feat_name} out of range: {value}"

    def test_distress_from_geometry_range(self):
        """Distress score from geometry should be 0–1."""
        from ml.face_analyzer import _compute_distress_from_geometry

        # Low activation = calm
        calm_feats = {
            "mouth_opening": 0.0, "brow_furrow": 0.0, "inner_brow_pull": 0.0,
            "eye_squeeze": 0.0, "lip_corner_down": 0.0, "chin_raise": 0.0,
            "nasolabial_furrow": 0.0, "face_asymmetry": 0.0,
        }
        score_calm = _compute_distress_from_geometry(calm_feats)
        assert 0.0 <= score_calm <= 1.0

        # High activation = distressed
        distressed_feats = {
            "mouth_opening": 0.9, "brow_furrow": 0.8, "inner_brow_pull": 0.7,
            "eye_squeeze": 0.8, "lip_corner_down": 0.7, "chin_raise": 0.6,
            "nasolabial_furrow": 0.5, "face_asymmetry": 0.3,
        }
        score_distress = _compute_distress_from_geometry(distressed_feats)
        assert 0.0 <= score_distress <= 1.0
        assert score_distress > score_calm, "Distressed face should score higher"

    def test_need_prediction_returns_valid_labels(self):
        """Need prediction should return valid need labels and sum to ~1."""
        from ml.face_analyzer import _predict_need_from_geometry, NEED_LABELS

        features = {
            "mouth_opening": 0.8, "brow_furrow": 0.7, "inner_brow_pull": 0.6,
            "eye_squeeze": 0.8, "lip_corner_down": 0.5, "chin_raise": 0.4,
            "nasolabial_furrow": 0.6, "face_asymmetry": 0.1,
        }
        result = _predict_need_from_geometry(features, 0.8)

        assert result["need_label"] in NEED_LABELS
        assert 0.0 <= result["confidence"] <= 1.0
        assert set(result["all_needs"].keys()) == set(NEED_LABELS)
        total = sum(result["all_needs"].values())
        assert 0.95 <= total <= 1.05, f"Need scores should sum to ~1, got {total}"

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

    def test_feature_display_names(self):
        """All geometric features should have display names."""
        from ml.face_analyzer import FEATURE_DISPLAY_NAMES, FEATURE_DISTRESS_WEIGHTS

        for feat_name in FEATURE_DISTRESS_WEIGHTS:
            assert feat_name in FEATURE_DISPLAY_NAMES, f"Missing display name for: {feat_name}"


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
        """Full fusion with audio + face should use rebalanced 60/25/15 weights."""
        from ml.multimodal_analyzer import fuse_predictions

        audio = {
            "success": True,
            "need_label": "hungry",
            "confidence": 0.8,
            "all_needs": {"hungry": 0.8, "diaper": 0.1, "sleepy": 0.05, "pain": 0.03, "calm": 0.02},
        }
        face = {
            "success": True,
            "confidence": 0.6,
            "distress_score": 0.7,
            "distress_intensity": "high",
            "all_needs": {"pain": 0.4, "hungry": 0.3, "diaper": 0.15, "sleepy": 0.1, "calm": 0.05},
            "stress_features": {"Mouth Opening (AU27)": 0.8, "Eye Squeeze (AU6+7)": 0.6},
        }

        result = fuse_predictions(audio, face, None)
        assert result["success"] is True
        assert result["modality"] == "combined"
        assert result["fusion_weights"]["audio"] == 0.60
        assert result["fusion_weights"]["face"] == 0.25
        assert result["fusion_weights"]["context"] == 0.15

    def test_confidence_weighted_fusion(self):
        """When audio confidence is low, face should get more weight."""
        from ml.multimodal_analyzer import fuse_predictions

        audio = {
            "success": True,
            "need_label": "hungry",
            "confidence": 0.2,  # Very low confidence
            "all_needs": {"hungry": 0.3, "diaper": 0.25, "sleepy": 0.2, "pain": 0.15, "calm": 0.1},
        }
        face = {
            "success": True,
            "confidence": 0.7,  # High confidence
            "distress_score": 0.8,
            "distress_intensity": "severe",
            "all_needs": {"pain": 0.6, "hungry": 0.2, "diaper": 0.1, "sleepy": 0.05, "calm": 0.05},
        }

        result = fuse_predictions(audio, face, None)
        # Audio is uncertain, face should get more weight
        assert result["fusion_weights"]["face"] > 0.25  # More than default
        assert result["fusion_weights"]["audio"] < 0.60  # Less than default

    def test_face_only_more_reliable(self):
        """Face-only mode should now get 50/50 (more reliable with geometric features)."""
        from ml.multimodal_analyzer import fuse_predictions

        face = {
            "success": True,
            "confidence": 0.6,
            "distress_score": 0.5,
            "distress_intensity": "moderate",
            "all_needs": {"pain": 0.3, "hungry": 0.25, "diaper": 0.2, "sleepy": 0.15, "calm": 0.1},
        }

        result = fuse_predictions(None, face, None)
        assert result["fusion_weights"]["face"] == 0.50
        assert result["fusion_weights"]["context"] == 0.50


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
