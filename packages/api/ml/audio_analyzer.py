"""Baby cry need analyzer — classifies baby cry needs from audio.

Pipeline:
1. Load audio via librosa (supports wav, mp3, m4a, ogg, webm)
2. Extract acoustic features (duration, energy, pitch, spectral centroid, MFCCs)
3. Generate Mel spectrogram (for frontend visualization)
4. Classify cry reason using Wav2Vec2 XLSR-53 transformer model
5. Compute acoustic heuristics from extracted features
6. Ensemble: 75% model + 25% heuristics → final need scores

Model: Wiam/baby-cry-classification-finetuned-babycry-v4
  - Architecture: Wav2Vec2 Large XLSR-53 (pre-trained on 53 languages)
  - Fine-tuned on baby cry classification dataset
  - Accuracy: ~81.5%
  - Classes: hungry, belly_pain, discomfort, tired, burping, scared, cold_hot, lonely

Need labels: hungry, pain, sleepy, diaper, calm
"""

import io
import base64
import logging
import tempfile
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ─── Lazy-loaded singleton ───────────────────────────────────

_cry_classifier = None


# ─── Label mapping ───────────────────────────────────────────

# Map baby cry model outputs → Kynari need labels
CRY_TO_NEED_MAP = {
    # Primary mappings
    "hungry":     "hungry",
    "belly_pain": "pain",
    "discomfort":  "diaper",     # discomfort often = wet/soiled diaper
    "tired":      "sleepy",
    "burping":    "calm",
    "scared":     "pain",       # scared → distress/pain bucket
    "cold_hot":   "diaper",     # temperature discomfort → comfort/diaper bucket
    "lonely":     "calm",       # lonely → needs comfort/attention

    # Case variations & fallbacks
    "Hungry":     "hungry",
    "Belly_pain": "pain",
    "Discomfort": "diaper",
    "Tired":      "sleepy",
    "Burping":    "calm",
    "Scared":     "pain",
    "Cold_hot":   "diaper",
    "Lonely":     "calm",
    "belly pain": "pain",
    "hunger":     "hungry",
    "tiredness":  "sleepy",
    "pain":       "pain",
    "cold":       "diaper",
    "hot":        "diaper",
}

# Human-friendly need descriptions
NEED_DESCRIPTIONS = {
    "hungry": "Your baby might be hungry 🍼",
    "pain":   "Your baby might have belly pain or gas 🤕",
    "calm":   "Your baby seems calm or needs comfort 😌",
    "sleepy": "Your baby might be tired and sleepy 😴",
    "diaper": "Your baby might need a diaper change or feels discomfort 💩",
}

# All possible need labels
NEED_LABELS = ["hungry", "diaper", "sleepy", "pain", "calm"]


# ─── Model loading ───────────────────────────────────────────

def _load_cry_classifier():
    """Lazy-load the Wav2Vec2 baby cry classification pipeline.

    Uses Wav2Vec2 Large XLSR-53 fine-tuned on baby cry data.
    Falls back to the lighter foduucom model if Wav2Vec2 fails to load.
    """
    global _cry_classifier
    if _cry_classifier is not None:
        return _cry_classifier

    # Primary: Wav2Vec2 XLSR-53 (higher accuracy)
    models_to_try = [
        "Wiam/baby-cry-classification-finetuned-babycry-v4",
        "foduucom/baby-cry-classification",  # fallback
    ]

    for model_name in models_to_try:
        try:
            from transformers import pipeline
            _cry_classifier = pipeline(
                "audio-classification",
                model=model_name,
                device=-1,  # CPU
            )
            logger.info(f"Baby cry classifier loaded: {model_name}")
            return _cry_classifier
        except Exception as e:
            logger.warning(f"Failed to load {model_name}: {e}")
            continue

    raise RuntimeError("No cry classifier available")


# ─── Spectrogram generation ─────────────────────────────────

def generate_spectrogram_b64(y: np.ndarray, sr: int) -> str | None:
    """Generate a Mel spectrogram image and return as base64 PNG."""
    try:
        import librosa
        import librosa.display

        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
        S_dB = librosa.power_to_db(S, ref=np.max)

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


# ─── Acoustic feature extraction ─────────────────────────────

def extract_audio_features(y: np.ndarray, sr: int) -> dict[str, Any]:
    """Extract rich acoustic features for heuristics + metadata."""
    import librosa

    duration = len(y) / sr
    rms = float(np.sqrt(np.mean(y**2)))

    # Pitch (fundamental frequency)
    try:
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = pitches[magnitudes > np.median(magnitudes)]
        pitch_values = pitch_values[pitch_values > 0]
        mean_pitch = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0.0
        pitch_std = float(np.std(pitch_values)) if len(pitch_values) > 0 else 0.0
    except Exception:
        mean_pitch = 0.0
        pitch_std = 0.0

    # Zero crossing rate
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))

    # Spectral centroid — brightness of the sound
    try:
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    except Exception:
        centroid = 0.0

    # Spectral rolloff — frequency below which most energy is concentrated
    try:
        rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    except Exception:
        rolloff = 0.0

    # MFCCs — timbral texture (13 coefficients)
    try:
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_means = [float(np.mean(mfccs[i])) for i in range(13)]
        mfcc_var = float(np.mean(np.var(mfccs, axis=1)))
    except Exception:
        mfcc_means = [0.0] * 13
        mfcc_var = 0.0

    # RMS energy variance (rhythmic patterns)
    try:
        rms_frames = librosa.feature.rms(y=y)[0]
        energy_var = float(np.var(rms_frames))
        energy_peaks = int(np.sum(rms_frames > np.mean(rms_frames) * 1.5))
    except Exception:
        energy_var = 0.0
        energy_peaks = 0

    return {
        "duration_seconds": round(duration, 2),
        "rms_energy": round(rms, 6),
        "mean_pitch_hz": round(mean_pitch, 1),
        "pitch_std_hz": round(pitch_std, 1),
        "zero_crossing_rate": round(zcr, 6),
        "spectral_centroid": round(centroid, 1),
        "spectral_rolloff": round(rolloff, 1),
        "mfcc_variance": round(mfcc_var, 4),
        "energy_variance": round(energy_var, 8),
        "energy_peaks": energy_peaks,
    }


# ─── Acoustic heuristics ────────────────────────────────────

def compute_acoustic_heuristics(features: dict[str, Any]) -> dict[str, float]:
    """Compute need likelihood from acoustic features using cry research heuristics.

    Based on published infant cry research:
    - Pain: high pitch (>500Hz), high energy, high ZCR, sudden onset
    - Hungry: medium pitch (300-500Hz), rhythmic energy pattern, moderate ZCR
    - Sleepy: low pitch (<300Hz), low energy, smooth spectrum, low variability
    - Diaper: intermittent medium-high energy, moderate pitch, high spectral centroid
    - Calm: low energy, low pitch, minimal variability

    Returns: dict of need → score (0.0 to 1.0)
    """
    scores = {label: 0.1 for label in NEED_LABELS}  # uniform prior

    pitch = features.get("mean_pitch_hz", 0)
    pitch_std = features.get("pitch_std_hz", 0)
    energy = features.get("rms_energy", 0)
    zcr = features.get("zero_crossing_rate", 0)
    centroid = features.get("spectral_centroid", 0)
    mfcc_var = features.get("mfcc_variance", 0)
    energy_var = features.get("energy_variance", 0)
    energy_peaks = features.get("energy_peaks", 0)

    # ── Pain: high pitch + high energy + high ZCR ─────────
    if pitch > 500:
        scores["pain"] += 0.35
    elif pitch > 400:
        scores["pain"] += 0.15
    if energy > 0.05:
        scores["pain"] += 0.2
    if zcr > 0.1:
        scores["pain"] += 0.15
    if pitch_std > 100:  # erratic pitch = distress
        scores["pain"] += 0.1

    # ── Hungry: medium pitch + rhythmic energy ────────────
    if 250 < pitch < 500:
        scores["hungry"] += 0.25
    if 0.02 < energy < 0.06:
        scores["hungry"] += 0.15
    if energy_peaks >= 3:  # rhythmic crying pattern
        scores["hungry"] += 0.2
    if 0.00001 < energy_var < 0.001:  # moderate rhythmic variation
        scores["hungry"] += 0.1

    # ── Sleepy: low pitch + low energy + smooth ───────────
    if pitch < 300 and pitch > 0:
        scores["sleepy"] += 0.3
    if energy < 0.03 and energy > 0:
        scores["sleepy"] += 0.25
    if mfcc_var < 50:
        scores["sleepy"] += 0.15
    if pitch_std < 50:  # steady pitch = whining/fussing
        scores["sleepy"] += 0.1

    # ── Diaper: intermittent, moderate-high centroid ──────
    if centroid > 3000:
        scores["diaper"] += 0.2
    if 300 < pitch < 450:
        scores["diaper"] += 0.15
    if energy_peaks >= 2:
        scores["diaper"] += 0.1
    if energy_var > 0.0005:
        scores["diaper"] += 0.1

    # ── Calm: very low energy, minimal variability ────────
    if energy < 0.015:
        scores["calm"] += 0.4
    if pitch < 200 or pitch == 0:
        scores["calm"] += 0.2
    if energy_var < 0.00005:
        scores["calm"] += 0.15

    # Normalize to sum to 1
    total = sum(scores.values())
    if total > 0:
        scores = {k: round(v / total, 4) for k, v in scores.items()}

    return scores


# ─── Ensemble scoring ───────────────────────────────────────

MODEL_WEIGHT = 0.75
HEURISTIC_WEIGHT = 0.25


def ensemble_scores(
    model_scores: dict[str, float],
    heuristic_scores: dict[str, float],
) -> dict[str, float]:
    """Combine model predictions with acoustic heuristics.

    Weighting: 75% model + 25% heuristics.
    When model confidence is very low (<0.3 for top class),
    heuristics get more weight (50/50).
    """
    # Check model confidence
    max_model_score = max(model_scores.values()) if model_scores else 0
    if max_model_score < 0.3:
        # Model is uncertain — give heuristics more weight
        w_model, w_heuristic = 0.50, 0.50
    else:
        w_model, w_heuristic = MODEL_WEIGHT, HEURISTIC_WEIGHT

    fused = {}
    for label in NEED_LABELS:
        fused[label] = (
            w_model * model_scores.get(label, 0.0) +
            w_heuristic * heuristic_scores.get(label, 0.0)
        )

    # Normalize
    total = sum(fused.values())
    if total > 0:
        fused = {k: round(v / total, 4) for k, v in fused.items()}

    return fused


# ─── Main analysis functions ─────────────────────────────────

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
    """Full pipeline: load → features → spectrogram → classify → heuristics → ensemble.

    Args:
        file_path: Path to an audio file (wav/mp3/m4a/ogg/webm)

    Returns:
        Analysis result with need label, confidence, spectrogram, etc.
    """
    try:
        import librosa
    except ImportError:
        return {
            "success": False,
            "error": "missing_dependency",
            "message": "librosa is required for audio analysis.",
        }

    # Load audio
    try:
        y, sr = librosa.load(file_path, sr=16000, duration=10.0)
    except Exception as e:
        return {
            "success": False,
            "error": "invalid_audio",
            "message": f"Could not process audio file: {str(e)}",
        }

    # Check minimum length
    duration = len(y) / sr
    if duration < 0.5:
        return {
            "success": False,
            "error": "audio_too_short",
            "message": "Audio is too short. Please record at least 1 second of audio.",
        }

    # ── Step 1: Extract acoustic features ───────────────
    audio_features = extract_audio_features(y, sr)

    # ── Step 2: Generate spectrogram ────────────────────
    spectrogram_b64 = generate_spectrogram_b64(y, sr)

    # ── Step 3: Run Wav2Vec2 model classification ───────
    model_need_scores: dict[str, float] = {label: 0.0 for label in NEED_LABELS}
    raw_classes = {}
    model_loaded = False

    try:
        classifier = _load_cry_classifier()
        results = classifier(file_path)
        model_loaded = True

        for r in results:
            raw_label = r["label"].lower().replace(" ", "_")
            score = r["score"]
            raw_classes[raw_label] = round(score, 4)

            need_label = CRY_TO_NEED_MAP.get(raw_label)
            if need_label:
                # Accumulate — multiple raw labels can map to same need
                model_need_scores[need_label] = max(model_need_scores[need_label], score)

        # Normalize model scores
        total = sum(model_need_scores.values())
        if total > 0:
            model_need_scores = {k: round(v / total, 4) for k, v in model_need_scores.items()}

    except Exception as e:
        logger.warning(f"Cry classification failed, using heuristics only: {e}")

    # ── Step 4: Compute acoustic heuristics ─────────────
    heuristic_scores = compute_acoustic_heuristics(audio_features)

    # ── Step 5: Ensemble ────────────────────────────────
    if model_loaded:
        final_scores = ensemble_scores(model_need_scores, heuristic_scores)
    else:
        # Model failed — use heuristics only
        final_scores = heuristic_scores

    # ── Step 6: Build result ────────────────────────────
    sorted_needs = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
    primary_need = sorted_needs[0][0]
    primary_confidence = sorted_needs[0][1]
    secondary_need = sorted_needs[1][0] if len(sorted_needs) > 1 else None

    description = NEED_DESCRIPTIONS.get(primary_need, f"Detected: {primary_need}")

    return {
        "success": True,
        "modality": "voice",
        "need_label": primary_need,
        "need_description": description,
        "confidence": round(primary_confidence, 4),
        "secondary_need": secondary_need,
        "all_needs": final_scores,
        "raw_model_classes": raw_classes,
        "audio_features": audio_features,
        "spectrogram_b64": spectrogram_b64,
    }
