"""Audio cry analyzer — classifies baby cry reasons from audio.

Pipeline:
1. Load audio via librosa (supports wav, mp3, m4a, ogg)
2. Extract MFCC features
3. Classify using HuggingFace pipeline (foduucom/baby-cry-classification)

Cry reasons → Kynari emotion labels:
    hungry      → frustrated
    belly_pain  → sad
    burping     → neutral
    discomfort  → angry
    tired       → neutral
"""

import io
import logging
import tempfile
from typing import Any

logger = logging.getLogger(__name__)

# Lazy-loaded singleton
_cry_classifier = None

# Map baby cry reasons → Kynari emotion labels
CRY_REASON_MAP = {
    "hungry": "frustrated",
    "belly_pain": "sad",
    "burping": "neutral",
    "discomfort": "angry",
    "tired": "neutral",
    # Fallbacks for alternative label formats
    "Hungry": "frustrated",
    "Belly_pain": "sad",
    "Burping": "neutral",
    "Discomfort": "angry",
    "Tired": "neutral",
    "belly pain": "sad",
    "hunger": "frustrated",
    "tiredness": "neutral",
}

# Human-friendly cry reason descriptions
CRY_DESCRIPTIONS = {
    "hungry": "Your baby might be hungry",
    "belly_pain": "Your baby might have belly pain or gas",
    "burping": "Your baby might need burping",
    "discomfort": "Your baby seems uncomfortable",
    "tired": "Your baby might be tired and sleepy",
}


def _load_cry_classifier():
    """Lazy-load the baby cry classification pipeline."""
    global _cry_classifier
    if _cry_classifier is None:
        try:
            from transformers import pipeline
            _cry_classifier = pipeline(
                "audio-classification",
                model="foduucom/baby-cry-classification",
                device=-1,  # CPU
            )
            logger.info("Baby cry classifier loaded")
        except Exception as e:
            logger.error(f"Failed to load cry classifier: {e}")
            raise RuntimeError("Cry classifier unavailable") from e
    return _cry_classifier


def analyze_audio_bytes(audio_data: bytes, filename: str = "audio.wav") -> dict[str, Any]:
    """Analyze audio from raw bytes.

    Writes to a temp file since the HF pipeline expects a file path.
    """
    suffix = "." + filename.rsplit(".", 1)[-1] if "." in filename else ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(audio_data)
        tmp.flush()
        return analyze_audio_file(tmp.name)


def analyze_audio_file(file_path: str) -> dict[str, Any]:
    """Full pipeline: load audio → classify cry reason.

    Args:
        file_path: Path to an audio file (wav/mp3/m4a/ogg)

    Returns:
        Analysis result dict with emotion label, confidence, cry reason, etc.
    """
    try:
        import librosa
    except ImportError:
        return {
            "success": False,
            "error": "missing_dependency",
            "message": "librosa is required for audio analysis.",
        }

    # Validate audio can be loaded
    try:
        y, sr = librosa.load(file_path, sr=16000, duration=10.0)
    except Exception as e:
        return {
            "success": False,
            "error": "invalid_audio",
            "message": f"Could not process audio file: {str(e)}",
        }

    # Check minimum audio length (at least 0.5 seconds)
    duration = len(y) / sr
    if duration < 0.5:
        return {
            "success": False,
            "error": "audio_too_short",
            "message": "Audio is too short. Please record at least 1 second of audio.",
        }

    # Run classification
    try:
        classifier = _load_cry_classifier()
        results = classifier(file_path)
    except Exception as e:
        logger.error(f"Cry classification failed: {e}")
        return {
            "success": False,
            "error": "classification_failed",
            "message": "Failed to classify the audio. Please try again.",
        }

    # Parse results
    all_classes = {}
    for r in results:
        label = r["label"].lower().replace(" ", "_")
        all_classes[label] = round(r["score"], 4)

    top_label = max(all_classes, key=all_classes.get)
    top_confidence = all_classes[top_label]

    # Map cry reason to Kynari emotion
    emotion_label = CRY_REASON_MAP.get(top_label, "neutral")

    # Get human-friendly description
    description = CRY_DESCRIPTIONS.get(top_label, f"Detected: {top_label}")

    return {
        "success": True,
        "modality": "voice",
        "cry_reason": top_label,
        "cry_description": description,
        "emotion_label": emotion_label,
        "confidence": round(top_confidence, 4),
        "all_classes": all_classes,
        "audio_duration_seconds": round(duration, 2),
    }
