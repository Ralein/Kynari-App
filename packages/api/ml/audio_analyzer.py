"""Baby cry need analyzer — classifies baby cry needs from audio.

Pipeline:
1. Load audio via librosa (supports wav, mp3, m4a, ogg, webm)
2. Cry/no-cry detection gate (energy + pitch threshold)
3. Extract rich acoustic features (duration, energy, pitch, spectral, MFCCs, temporal)
4. Generate Mel spectrogram (for frontend visualization)
5. Classify cry reason using Wav2Vec2 XLSR-53 transformer model (primary)
6. Compute acoustic heuristics from extracted features
7. Ensemble: confidence-adaptive weights → final need scores

Model priority:
  1. Wiam/baby-cry-classification-finetuned-babycry-v4 (81.5% accuracy, Wav2Vec2 XLSR-53)
  2. foduucom/baby-cry-classification (38.5% accuracy, fast CNN fallback)

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
_active_model_name: str | None = None


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
    """Lazy-load the baby cry classification pipeline.

    Priority: Wav2Vec2 XLSR-53 (81.5% accuracy, ~8-15s inference)
    Fallback: Fast CNN model (~1-2s inference, 38.5% accuracy)
    """
    global _cry_classifier, _active_model_name
    if _cry_classifier is not None:
        return _cry_classifier

    # Primary: accurate Wav2Vec2; Fallback: fast but less accurate CNN
    models_to_try = [
        ("Wiam/baby-cry-classification-finetuned-babycry-v4", "wav2vec2"),
        ("foduucom/baby-cry-classification", "cnn"),
    ]

    for model_name, model_type in models_to_try:
        try:
            from transformers import pipeline
            _cry_classifier = pipeline(
                "audio-classification",
                model=model_name,
                device=-1,  # CPU
            )
            _active_model_name = model_name
            logger.info(f"Baby cry classifier loaded: {model_name} ({model_type})")
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


# ─── Cry detection gate ──────────────────────────────────────

def detect_crying(y: np.ndarray, sr: int) -> dict[str, Any]:
    """Detect whether the audio contains baby crying.

    Uses energy threshold + pitch range to distinguish:
    - Crying: sustained vocalization, moderate-high energy, pitch 250-800Hz
    - Babbling: short bursts, variable pitch
    - Silence: very low energy
    - Background noise: no pitch structure

    Returns: {"is_crying": bool, "cry_confidence": float, "audio_type": str}
    """
    import librosa

    duration = len(y) / sr
    rms = float(np.sqrt(np.mean(y**2)))

    # Energy-based silence detection
    if rms < 0.005:
        return {"is_crying": False, "cry_confidence": 0.05, "audio_type": "silence"}

    # Pitch extraction for crying detection
    try:
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = pitches[magnitudes > np.median(magnitudes)]
        pitch_values = pitch_values[pitch_values > 0]

        if len(pitch_values) == 0:
            return {"is_crying": False, "cry_confidence": 0.1, "audio_type": "noise"}

        mean_pitch = float(np.mean(pitch_values))
        pitch_coverage = len(pitch_values) / max(pitches.shape[1], 1)

    except Exception:
        mean_pitch = 0.0
        pitch_coverage = 0.0

    # Crying characteristics:
    # - Baby cry pitch typically 250-800 Hz
    # - Sustained vocalization (pitch present in >30% of frames)
    # - Moderate to high energy
    is_cry_pitch = 200 < mean_pitch < 900
    is_sustained = pitch_coverage > 0.25
    is_loud_enough = rms > 0.01

    cry_confidence = 0.0
    if is_cry_pitch:
        cry_confidence += 0.4
    if is_sustained:
        cry_confidence += 0.3
    if is_loud_enough:
        cry_confidence += 0.2
    if rms > 0.03:
        cry_confidence += 0.1

    is_crying = cry_confidence >= 0.5

    if is_crying:
        audio_type = "crying"
    elif is_loud_enough and is_cry_pitch:
        audio_type = "fussing"
    elif is_loud_enough:
        audio_type = "babbling"
    else:
        audio_type = "quiet"

    return {
        "is_crying": is_crying,
        "cry_confidence": round(cry_confidence, 4),
        "audio_type": audio_type,
    }


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
        pitch_range = float(np.ptp(pitch_values)) if len(pitch_values) > 0 else 0.0
    except Exception:
        mean_pitch = 0.0
        pitch_std = 0.0
        pitch_range = 0.0

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

    # Spectral bandwidth — spread of the spectrum
    try:
        bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))
    except Exception:
        bandwidth = 0.0

    # Spectral contrast — valley-to-peak difference across subbands
    try:
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        contrast_mean = float(np.mean(contrast))
    except Exception:
        contrast_mean = 0.0

    # MFCCs — timbral texture (13 coefficients)
    try:
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_var = float(np.mean(np.var(mfccs, axis=1)))
        mfcc_delta_var = float(np.mean(np.var(librosa.feature.delta(mfccs), axis=1)))
    except Exception:
        mfcc_var = 0.0
        mfcc_delta_var = 0.0

    # RMS energy variance (rhythmic patterns)
    try:
        rms_frames = librosa.feature.rms(y=y)[0]
        energy_var = float(np.var(rms_frames))
        energy_peaks = int(np.sum(rms_frames > np.mean(rms_frames) * 1.5))
        # Energy onset strength — measures rhythmicity
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_rate = float(np.sum(onset_env > np.mean(onset_env) * 1.5)) / max(duration, 0.1)
    except Exception:
        energy_var = 0.0
        energy_peaks = 0
        onset_rate = 0.0

    # Temporal features — cry bout patterns
    try:
        # Segment the audio into voiced/unvoiced regions using energy
        frame_length = int(0.025 * sr)  # 25ms frames
        hop_length = int(0.010 * sr)    # 10ms hops
        rms_short = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        voiced_mask = rms_short > np.mean(rms_short) * 0.5
        # Count transitions (cry bouts)
        transitions = int(np.sum(np.abs(np.diff(voiced_mask.astype(int)))))
        cry_bout_count = max(transitions // 2, 0)
    except Exception:
        cry_bout_count = 0

    return {
        "duration_seconds": round(duration, 2),
        "rms_energy": round(rms, 6),
        "mean_pitch_hz": round(mean_pitch, 1),
        "pitch_std_hz": round(pitch_std, 1),
        "pitch_range_hz": round(pitch_range, 1),
        "zero_crossing_rate": round(zcr, 6),
        "spectral_centroid": round(centroid, 1),
        "spectral_rolloff": round(rolloff, 1),
        "spectral_bandwidth": round(bandwidth, 1),
        "spectral_contrast": round(contrast_mean, 4),
        "mfcc_variance": round(mfcc_var, 4),
        "mfcc_delta_variance": round(mfcc_delta_var, 4),
        "energy_variance": round(energy_var, 8),
        "energy_peaks": energy_peaks,
        "onset_rate": round(onset_rate, 2),
        "cry_bout_count": cry_bout_count,
    }


# ─── Acoustic heuristics ────────────────────────────────────

def compute_acoustic_heuristics(features: dict[str, Any]) -> dict[str, float]:
    """Compute need likelihood from acoustic features using cry research heuristics.

    Based on published infant cry research:
    - Pain: high pitch (>500Hz), high energy, high ZCR, sudden onset, wide pitch range
    - Hungry: medium pitch (300-500Hz), rhythmic energy pattern, moderate ZCR, regular bouts
    - Sleepy: low pitch (<300Hz), low energy, smooth spectrum, low variability
    - Diaper: intermittent medium-high energy, moderate pitch, high spectral centroid
    - Calm: low energy, low pitch, minimal variability

    Returns: dict of need → score (0.0 to 1.0)
    """
    scores = {label: 0.1 for label in NEED_LABELS}  # uniform prior

    pitch = features.get("mean_pitch_hz", 0)
    pitch_std = features.get("pitch_std_hz", 0)
    pitch_range = features.get("pitch_range_hz", 0)
    energy = features.get("rms_energy", 0)
    zcr = features.get("zero_crossing_rate", 0)
    centroid = features.get("spectral_centroid", 0)
    bandwidth = features.get("spectral_bandwidth", 0)
    contrast = features.get("spectral_contrast", 0)
    mfcc_var = features.get("mfcc_variance", 0)
    mfcc_delta_var = features.get("mfcc_delta_variance", 0)
    energy_var = features.get("energy_variance", 0)
    energy_peaks = features.get("energy_peaks", 0)
    onset_rate = features.get("onset_rate", 0)
    cry_bouts = features.get("cry_bout_count", 0)

    # ── Pain: high pitch + high energy + high ZCR + wide pitch range ──
    if pitch > 500:
        scores["pain"] += 0.30
    elif pitch > 400:
        scores["pain"] += 0.15
    if energy > 0.05:
        scores["pain"] += 0.15
    if zcr > 0.1:
        scores["pain"] += 0.10
    if pitch_std > 100:  # erratic pitch = distress
        scores["pain"] += 0.10
    if pitch_range > 300:  # wide range = pain cry
        scores["pain"] += 0.10
    if onset_rate < 3:  # sustained cry, not rhythmic
        scores["pain"] += 0.05

    # ── Hungry: medium pitch + rhythmic energy + regular bouts ──
    if 250 < pitch < 500:
        scores["hungry"] += 0.20
    if 0.02 < energy < 0.06:
        scores["hungry"] += 0.12
    if energy_peaks >= 3:  # rhythmic crying pattern
        scores["hungry"] += 0.18
    if 0.00001 < energy_var < 0.001:  # moderate rhythmic variation
        scores["hungry"] += 0.08
    if cry_bouts >= 3:  # multiple cry bouts = rhythmic hunger cry
        scores["hungry"] += 0.12
    if onset_rate > 3:  # rhythmic onsets
        scores["hungry"] += 0.08

    # ── Sleepy: low pitch + low energy + smooth + low delta MFCC ──
    if pitch < 300 and pitch > 0:
        scores["sleepy"] += 0.25
    if energy < 0.03 and energy > 0:
        scores["sleepy"] += 0.20
    if mfcc_var < 50:
        scores["sleepy"] += 0.10
    if pitch_std < 50:  # steady pitch = whining/fussing
        scores["sleepy"] += 0.10
    if mfcc_delta_var < 20:  # smooth, not changing much
        scores["sleepy"] += 0.08
    if bandwidth < 2000:  # narrow spectrum = whimper
        scores["sleepy"] += 0.07

    # ── Diaper: intermittent, moderate-high centroid, irregular ──
    if centroid > 3000:
        scores["diaper"] += 0.18
    if 300 < pitch < 450:
        scores["diaper"] += 0.12
    if energy_peaks >= 2:
        scores["diaper"] += 0.08
    if energy_var > 0.0005:
        scores["diaper"] += 0.08
    if contrast > 20:  # high spectral contrast = sharp cries
        scores["diaper"] += 0.08

    # ── Calm: very low energy, minimal variability ──
    if energy < 0.015:
        scores["calm"] += 0.35
    if pitch < 200 or pitch == 0:
        scores["calm"] += 0.18
    if energy_var < 0.00005:
        scores["calm"] += 0.12
    if cry_bouts == 0:
        scores["calm"] += 0.10

    # Normalize to sum to 1
    total = sum(scores.values())
    if total > 0:
        scores = {k: round(v / total, 4) for k, v in scores.items()}

    return scores


# ─── Ensemble scoring ───────────────────────────────────────

# Confidence-adaptive weights
HIGH_CONF_MODEL_WEIGHT = 0.85
HIGH_CONF_HEURISTIC_WEIGHT = 0.15
MED_CONF_MODEL_WEIGHT = 0.70
MED_CONF_HEURISTIC_WEIGHT = 0.30
LOW_CONF_MODEL_WEIGHT = 0.50
LOW_CONF_HEURISTIC_WEIGHT = 0.50


def ensemble_scores(
    model_scores: dict[str, float],
    heuristic_scores: dict[str, float],
) -> dict[str, float]:
    """Combine model predictions with acoustic heuristics.

    Confidence-adaptive weighting:
    - Model confidence ≥ 0.6: 85% model + 15% heuristics (model is confident)
    - Model confidence 0.3-0.6: 70% model + 30% heuristics (moderate)
    - Model confidence < 0.3: 50% model + 50% heuristics (model unsure)
    """
    # Check model confidence
    max_model_score = max(model_scores.values()) if model_scores else 0

    if max_model_score >= 0.6:
        w_model, w_heuristic = HIGH_CONF_MODEL_WEIGHT, HIGH_CONF_HEURISTIC_WEIGHT
    elif max_model_score >= 0.3:
        w_model, w_heuristic = MED_CONF_MODEL_WEIGHT, MED_CONF_HEURISTIC_WEIGHT
    else:
        w_model, w_heuristic = LOW_CONF_MODEL_WEIGHT, LOW_CONF_HEURISTIC_WEIGHT

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
    """Full pipeline: load → cry gate → features → spectrogram → classify → heuristics → ensemble.

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

    # ── Step 1: Cry detection gate ──────────────────────
    cry_detection = detect_crying(y, sr)

    # If no crying detected, return calm immediately
    if not cry_detection["is_crying"] and cry_detection["audio_type"] in ("silence", "noise"):
        return {
            "success": True,
            "modality": "voice",
            "need_label": "calm",
            "need_description": NEED_DESCRIPTIONS["calm"],
            "confidence": 0.75,
            "secondary_need": None,
            "all_needs": {"calm": 0.75, "hungry": 0.08, "sleepy": 0.08, "diaper": 0.05, "pain": 0.04},
            "raw_model_classes": {},
            "audio_features": {"duration_seconds": round(duration, 2), "rms_energy": round(float(np.sqrt(np.mean(y**2))), 6)},
            "spectrogram_b64": None,
            "cry_detection": cry_detection,
        }

    # ── Step 2: Extract acoustic features ───────────────
    audio_features = extract_audio_features(y, sr)

    # ── Step 3: Generate spectrogram ────────────────────
    spectrogram_b64 = generate_spectrogram_b64(y, sr)

    # ── Step 4: Run classifier ──────────────────────────
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

    # ── Step 5: Compute acoustic heuristics ─────────────
    heuristic_scores = compute_acoustic_heuristics(audio_features)

    # ── Step 6: Ensemble ────────────────────────────────
    if model_loaded:
        final_scores = ensemble_scores(model_need_scores, heuristic_scores)
    else:
        # Model failed — use heuristics only
        final_scores = heuristic_scores

    # If audio was classified as fussing (not full cry), dampen non-calm scores slightly
    if cry_detection["audio_type"] == "fussing":
        calm_boost = 0.10
        final_scores["calm"] = final_scores.get("calm", 0.0) + calm_boost
        total = sum(final_scores.values())
        if total > 0:
            final_scores = {k: round(v / total, 4) for k, v in final_scores.items()}

    # ── Step 7: Build result ────────────────────────────
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
        "cry_detection": cry_detection,
        "model_used": _active_model_name,
    }
