"""Face distress analyzer — DeepFace-powered baby face need/distress detection.

Pipeline:
1. Face detection + emotion classification via DeepFace (RetinaFace backend)
2. Map emotions → NFCS-inspired distress score
3. Predict likely baby need from emotion profile
4. Quality gate: reject poor photos with actionable user feedback

Dependencies: deepface, numpy, Pillow, opencv-python

Based on:
  - NFCS (Neonatal Facial Coding System) — Grunau & Craig, 1987
  - FACS (Facial Action Coding System) — Ekman & Friesen, 1978
"""

import base64
import io
import logging
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ─── Lazy-loaded singleton ────────────────────────────────
_deepface_loaded = False

# ─── Need prediction labels ───────────────────────────────
NEED_LABELS = ["hungry", "diaper", "sleepy", "pain", "calm"]

NEED_DESCRIPTIONS = {
    "hungry": "Your baby's face suggests they might be hungry 🍼",
    "pain": "Your baby's expression suggests pain or discomfort 🤕",
    "calm": "Your baby looks calm or content 😌",
    "sleepy": "Your baby looks tired and sleepy 😴",
    "diaper": "Your baby may need a diaper change 💩",
}

# Quality gate messages
QUALITY_ERROR_MESSAGES = {
    "no_face": (
        "We couldn't detect a face in this image. Please take a clearer photo "
        "with your baby's face visible, well-lit, and facing the camera."
    ),
    "poor_quality": (
        "The image quality is too low for accurate analysis. Please ensure "
        "the photo is well-lit, not blurry, and shows your baby's face clearly "
        "from the front."
    ),
}


def _ensure_deepface():
    """Lazy-import DeepFace on first use."""
    global _deepface_loaded
    if not _deepface_loaded:
        try:
            from deepface import DeepFace  # noqa: F401
            _deepface_loaded = True
            logger.info("DeepFace loaded successfully")
        except ImportError as e:
            raise RuntimeError(
                "DeepFace is not installed. Run: pip install deepface"
            ) from e


# ─── Emotion → distress mapping ──────────────────────────
# DeepFace returns 7 emotions: angry, disgust, fear, happy, sad, surprise, neutral
# Each maps to a base distress level (0 = calm, 1 = max distress)
EMOTION_DISTRESS = {
    "angry": 0.88,
    "fear": 0.80,
    "sad": 0.65,
    "disgust": 0.62,
    "surprise": 0.30,
    "happy": 0.00,
    "neutral": 0.08,
}


def _compute_distress_from_emotions(emotions: dict[str, float]) -> float:
    """Compute distress score from DeepFace emotion probability distribution.

    Uses weighted combination of all emotion scores (not just the top-1),
    so mixed emotions are captured.

    Returns 0.0 (calm) to 1.0 (extreme distress).
    """
    if not emotions:
        return 0.2  # Default mild uncertainty

    # DeepFace returns percentages (0-100), normalise to [0,1]
    total = sum(emotions.values())
    if total <= 0:
        return 0.2

    distress = 0.0
    for emotion_name, pct in emotions.items():
        weight = pct / total  # Normalize to probability
        base = EMOTION_DISTRESS.get(emotion_name.lower(), 0.2)
        distress += weight * base

    # Apply infant calibration curve
    # Infants show less dynamic range than adults — stretch the mid-range
    calibrated = min(distress * 1.3, 1.0) ** 0.7

    return round(min(max(calibrated, 0.0), 1.0), 4)


def _extract_stress_features(emotions: dict[str, float]) -> dict[str, float]:
    """Extract the top activated features for display (replaces blendshapes)."""
    if not emotions:
        return {}

    # Normalise to 0-1 range
    total = sum(emotions.values())
    if total <= 0:
        return {}

    features = {}
    for name, pct in emotions.items():
        normalised = round(pct / total, 4)
        if normalised > 0.01:
            features[name] = normalised

    # Sort by activation, keep top 5
    sorted_feats = sorted(features.items(), key=lambda x: x[1], reverse=True)
    return {name: score for name, score in sorted_feats[:5]}


# ─── Need prediction from emotions ───────────────────────

NEED_EMOTION_PROFILES = {
    "hungry": {
        "expression_weights": {"sad": 0.35, "angry": 0.25, "disgust": 0.10, "neutral": 0.10},
        "distress_range": (0.20, 0.70),
        "weight": 1.0,
    },
    "pain": {
        "expression_weights": {"angry": 0.40, "fear": 0.30, "disgust": 0.15, "sad": 0.10},
        "distress_range": (0.45, 1.0),
        "weight": 1.15,
    },
    "sleepy": {
        "expression_weights": {"neutral": 0.35, "sad": 0.25, "surprise": 0.05},
        "distress_range": (0.05, 0.40),
        "weight": 0.90,
    },
    "diaper": {
        "expression_weights": {"disgust": 0.40, "sad": 0.20, "angry": 0.15},
        "distress_range": (0.20, 0.65),
        "weight": 1.0,
    },
    "calm": {
        "expression_weights": {"happy": 0.50, "neutral": 0.40, "surprise": 0.10},
        "distress_range": (0.0, 0.20),
        "weight": 0.85,
    },
}


def _predict_need_from_face(
    emotions: dict[str, float],
    distress_score: float,
) -> dict[str, Any]:
    """Predict baby need from DeepFace emotion profile."""
    # Normalise emotion percentages to probabilities
    total_emo = sum(emotions.values())
    emo_probs = {}
    if total_emo > 0:
        emo_probs = {k.lower(): v / total_emo for k, v in emotions.items()}

    need_scores: dict[str, float] = {label: 0.0 for label in NEED_LABELS}

    for need_name, profile in NEED_EMOTION_PROFILES.items():
        score = 0.0

        # 1. Emotion profile matching (60%)
        expr_match = 0.0
        for emo_name, weight in profile["expression_weights"].items():
            expr_match += emo_probs.get(emo_name, 0.0) * weight
        score += 0.60 * min(expr_match * 2.5, 1.0)  # Scale up since weights < 1

        # 2. Distress range match (25%)
        d_min, d_max = profile["distress_range"]
        if d_min <= distress_score <= d_max:
            range_center = (d_min + d_max) / 2.0
            range_width = d_max - d_min
            closeness = 1.0 - abs(distress_score - range_center) / max(range_width / 2, 0.01)
            score += 0.25 * min(max(closeness, 0.0), 1.0)

        # 3. Small base prior (15%) — prevents zero scores
        score += 0.15 * 0.2

        need_scores[need_name] = score * profile.get("weight", 1.0)

    # Normalize
    total = sum(need_scores.values())
    if total > 0:
        need_scores = {k: round(v / total, 4) for k, v in need_scores.items()}
    else:
        need_scores = {k: 0.2 for k in NEED_LABELS}

    sorted_needs = sorted(need_scores.items(), key=lambda x: x[1], reverse=True)
    primary = sorted_needs[0]
    secondary = sorted_needs[1] if len(sorted_needs) > 1 else None

    return {
        "need_label": primary[0],
        "confidence": primary[1],
        "secondary_need": secondary[0] if secondary else None,
        "all_needs": need_scores,
        "need_description": NEED_DESCRIPTIONS.get(primary[0], f"Detected: {primary[0]}"),
    }


# ─── Image helpers ────────────────────────────────────────

def decode_image(data: str | bytes) -> Image.Image:
    """Decode base64 string or raw bytes into a PIL Image."""
    if isinstance(data, str):
        if "," in data:
            data = data.split(",", 1)[1]
        raw = base64.b64decode(data)
    else:
        raw = data
    return Image.open(io.BytesIO(raw)).convert("RGB")


# ─── Main entry point ─────────────────────────────────────

def analyze_face(image: Image.Image) -> dict[str, Any]:
    """Full ML pipeline: detect face → emotions → distress → need.

    Uses DeepFace with RetinaFace backend for state-of-the-art
    face detection and 7-class emotion classification.

    Quality gate:
      - No face detected → actionable error message
      - Low confidence region → suggestion to retake photo

    Distress scale:
      0.00-0.10 calm      0.10-0.25 mild        0.25-0.45 moderate
      0.45-0.65 high      0.65-0.85 severe       0.85-1.00 worst
    """
    _ensure_deepface()
    from deepface import DeepFace

    # Convert PIL → numpy array for DeepFace
    img_array = np.array(image)

    # Validate minimum image dimensions
    h, w = img_array.shape[:2]
    if h < 48 or w < 48:
        return {
            "success": False,
            "error": "poor_quality",
            "message": QUALITY_ERROR_MESSAGES["poor_quality"],
        }

    # ── 1. Run DeepFace analysis ──────────────────────────────
    try:
        results = DeepFace.analyze(
            img_path=img_array,
            actions=["emotion"],
            detector_backend="retinaface",
            enforce_detection=True,
            silent=True,
        )
    except ValueError:
        # DeepFace raises ValueError when no face is detected
        return {
            "success": False,
            "error": "no_face_detected",
            "message": QUALITY_ERROR_MESSAGES["no_face"],
        }
    except Exception as e:
        logger.error(f"DeepFace analysis failed: {e}")
        return {
            "success": False,
            "error": "analysis_failed",
            "message": (
                "Face analysis encountered an error. Please try again "
                "with a different photo."
            ),
        }

    # DeepFace returns a list of dicts (one per face); take the first
    if not results:
        return {
            "success": False,
            "error": "no_face_detected",
            "message": QUALITY_ERROR_MESSAGES["no_face"],
        }

    face_data = results[0] if isinstance(results, list) else results

    # ── 2. Check face region quality ──────────────────────────
    face_region = face_data.get("region", {})
    face_w = face_region.get("w", 0)
    face_h = face_region.get("h", 0)
    face_conf = face_data.get("face_confidence", 0.0)

    # If detected face is very small or low confidence, warn the user
    if (face_w < 30 or face_h < 30) or (face_conf > 0 and face_conf < 0.5):
        return {
            "success": False,
            "error": "poor_quality",
            "message": QUALITY_ERROR_MESSAGES["poor_quality"],
        }

    # ── 3. Extract emotions ───────────────────────────────────
    emotions = face_data.get("emotion", {})
    dominant_emotion = face_data.get("dominant_emotion", "neutral")

    # ── 4. Compute distress score ─────────────────────────────
    distress_score = _compute_distress_from_emotions(emotions)

    # ── 5. Predict need from emotions ─────────────────────────
    need_prediction = _predict_need_from_face(emotions, distress_score)

    # ── 6. Extract top features for display ───────────────────
    stress_features = _extract_stress_features(emotions)

    # ── 7. Compute dominant emotion confidence ────────────────
    total_emo = sum(emotions.values())
    dominant_conf = round(emotions.get(dominant_emotion, 0.0) / total_emo, 4) if total_emo > 0 else 0.0

    # Classify intensity level
    if distress_score < 0.10:
        intensity = "calm"
    elif distress_score < 0.25:
        intensity = "mild"
    elif distress_score < 0.45:
        intensity = "moderate"
    elif distress_score < 0.65:
        intensity = "high"
    elif distress_score < 0.85:
        intensity = "severe"
    else:
        intensity = "worst"

    return {
        "success": True,
        "modality": "face",
        "distress_score": distress_score,
        "distress_intensity": intensity,
        # Need prediction (face-only)
        "need_label": need_prediction["need_label"],
        "need_description": need_prediction["need_description"],
        "confidence": need_prediction["confidence"],
        "secondary_need": need_prediction["secondary_need"],
        "all_needs": need_prediction["all_needs"],
        # Expression (from DeepFace)
        "expression": dominant_emotion,
        "expression_confidence": dominant_conf,
        # Top emotion activations (for UI display)
        "stress_features": stress_features,
        "faces_detected": len(results) if isinstance(results, list) else 1,
    }