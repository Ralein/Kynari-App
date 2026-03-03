"""Baby cry need analyzer — classifies baby cry needs from audio.

Pipeline:
1. Load audio via librosa (supports wav, mp3, m4a, ogg)
2. Extract audio features (duration, energy, pitch)
3. Generate Mel spectrogram (for frontend visualization)
4. Classify cry reason using HuggingFace pipeline (foduucom/baby-cry-classification)
5. Map cry reasons directly to need labels

Need labels:
    hungry      → hungry
    belly_pain  → pain
    discomfort  → pain
    tired       → sleepy
    burping     → calm
"""

import io
import base64
import logging
import tempfile
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# Lazy-loaded singleton
_cry_classifier = None

# Map baby cry model outputs → Kynari need labels
CRY_TO_NEED_MAP = {
    "hungry": "hungry",
    "belly_pain": "pain",
    "burping": "calm",
    "discomfort": "pain",
    "tired": "sleepy",
    # Case-insensitive fallbacks
    "Hungry": "hungry",
    "Belly_pain": "pain",
    "Burping": "calm",
    "Discomfort": "pain",
    "Tired": "sleepy",
    "belly pain": "pain",
    "hunger": "hungry",
    "tiredness": "sleepy",
}

# Human-friendly need descriptions
NEED_DESCRIPTIONS = {
    "hungry": "Your baby might be hungry 🍼",
    "pain": "Your baby might have belly pain or gas 🤕",
    "calm": "Your baby seems calm or needs burping 😌",
    "sleepy": "Your baby might be tired and sleepy 😴",
    "diaper": "Your baby might need a diaper change 💩",
}

# All possible need labels
NEED_LABELS = ["hungry", "diaper", "sleepy", "pain", "calm"]


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


def generate_spectrogram_b64(y: np.ndarray, sr: int) -> str | None:
    """Generate a Mel spectrogram image and return as base64 PNG.

    Used by the frontend to display a visual representation of the cry.
    """
    try:
        import librosa
        import librosa.display

        # Generate Mel spectrogram
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
        S_dB = librosa.power_to_db(S, ref=np.max)

        # Render to image without matplotlib GUI
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(1, 1, figsize=(6, 3), dpi=100)
        librosa.display.specshow(S_dB, sr=sr, x_axis="time", y_axis="mel", ax=ax, cmap="magma")
        ax.set_title("")
        ax.set_xlabel("")
        ax.set_ylabel("")
        fig.tight_layout(pad=0.5)

        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", transparent=True)
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except Exception as e:
        logger.warning(f"Spectrogram generation failed: {e}")
        return None


def extract_audio_features(y: np.ndarray, sr: int) -> dict[str, Any]:
    """Extract basic audio features for richer metadata."""
    import librosa

    duration = len(y) / sr
    rms = float(np.sqrt(np.mean(y**2)))

    # Pitch (fundamental frequency)
    try:
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = pitches[magnitudes > np.median(magnitudes)]
        pitch_values = pitch_values[pitch_values > 0]
        mean_pitch = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0.0
    except Exception:
        mean_pitch = 0.0

    # Zero crossing rate (indicates signal noisiness)
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))

    return {
        "duration_seconds": round(duration, 2),
        "rms_energy": round(rms, 6),
        "mean_pitch_hz": round(mean_pitch, 1),
        "zero_crossing_rate": round(zcr, 6),
    }


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
    """Full pipeline: load audio → extract features → generate spectrogram → classify need.

    Args:
        file_path: Path to an audio file (wav/mp3/m4a/ogg)

    Returns:
        Analysis result dict with need label, confidence, spectrogram, etc.
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

    # Extract audio features
    audio_features = extract_audio_features(y, sr)

    # Generate spectrogram for frontend display
    spectrogram_b64 = generate_spectrogram_b64(y, sr)

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

    # Parse results → need labels
    raw_classes = {}
    need_scores: dict[str, float] = {label: 0.0 for label in NEED_LABELS}

    for r in results:
        label = r["label"].lower().replace(" ", "_")
        score = r["score"]
        raw_classes[label] = round(score, 4)

        # Map to need label and accumulate
        need_label = CRY_TO_NEED_MAP.get(label)
        if need_label:
            need_scores[need_label] = max(need_scores[need_label], score)

    # Normalize need scores so they sum to 1
    total = sum(need_scores.values())
    if total > 0:
        need_scores = {k: round(v / total, 4) for k, v in need_scores.items()}

    # Primary and secondary needs
    sorted_needs = sorted(need_scores.items(), key=lambda x: x[1], reverse=True)
    primary_need = sorted_needs[0][0]
    primary_confidence = sorted_needs[0][1]
    secondary_need = sorted_needs[1][0] if len(sorted_needs) > 1 else None

    # Get human-friendly description
    description = NEED_DESCRIPTIONS.get(primary_need, f"Detected: {primary_need}")

    return {
        "success": True,
        "modality": "voice",
        "need_label": primary_need,
        "need_description": description,
        "confidence": round(primary_confidence, 4),
        "secondary_need": secondary_need,
        "all_needs": need_scores,
        "raw_model_classes": raw_classes,
        "audio_features": audio_features,
        "spectrogram_b64": spectrogram_b64,
    }
