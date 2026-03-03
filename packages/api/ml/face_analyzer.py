"""Face distress analyzer — ML-based baby face need/distress detection.

Pipeline:
1. Face detection + 52 blendshape prediction via MediaPipe FaceLandmarker
2. Expression classification via HuggingFace FER (ViT) model
3. Map blendshape action units → NFCS distress score
4. Predict likely baby need from expression + blendshape patterns
5. Output distress_score, need_label, expression, and raw blendshape features

Uses TWO neural networks:
  - MediaPipe FaceLandmarker with blendshapes (52 AU-like coefficients)
  - trpakov/vit-face-expression (facial expression recognition)

Based on:
  - NFCS (Neonatal Facial Coding System) — Grunau & Craig, 1987
  - FACS (Facial Action Coding System) — Ekman & Friesen, 1978
"""

import io
import os
import base64
import logging
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ─── Lazy-loaded singletons ────────────────────────────────
_face_landmarker = None
_expression_classifier = None

# Path to the downloaded .task model file
_MODEL_DIR = Path(__file__).parent / "models"
_MODEL_PATH = _MODEL_DIR / "face_landmarker.task"

# ─── Need prediction labels ───────────────────────────────
NEED_LABELS = ["hungry", "diaper", "sleepy", "pain", "calm"]

NEED_DESCRIPTIONS = {
    "hungry": "Your baby's face suggests they might be hungry 🍼",
    "pain": "Your baby's expression suggests pain or discomfort 🤕",
    "calm": "Your baby looks calm or content 😌",
    "sleepy": "Your baby looks tired and sleepy 😴",
    "diaper": "Your baby may need a diaper change 💩",
}

# ─── Expression → distress mapping ────────────────────────
EXPRESSION_DISTRESS = {
    "angry": 0.85,
    "disgust": 0.70,
    "fear": 0.80,
    "sad": 0.75,
    "surprise": 0.40,
    "happy": 0.05,
    "neutral": 0.10,
}


def _load_face_landmarker():
    """Lazy-load MediaPipe FaceLandmarker with blendshapes enabled."""
    global _face_landmarker
    if _face_landmarker is not None:
        return _face_landmarker

    try:
        import mediapipe as mp

        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Face landmarker model not found at {_MODEL_PATH}. "
                "Download from: https://storage.googleapis.com/mediapipe-models/"
                "face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
            )

        base_options = mp.tasks.BaseOptions(
            model_asset_path=str(_MODEL_PATH)
        )
        options = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            output_face_blendshapes=True,       # ← ML-predicted action units
            output_facial_transformation_matrixes=False,
        )
        _face_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
        logger.info("MediaPipe FaceLandmarker loaded with blendshapes enabled")
    except Exception as e:
        logger.error(f"Failed to load MediaPipe FaceLandmarker: {e}")
        raise RuntimeError("Face landmarker unavailable") from e
    return _face_landmarker


def _load_expression_classifier():
    """Lazy-load the facial expression recognition model."""
    global _expression_classifier
    if _expression_classifier is not None:
        return _expression_classifier

    try:
        from transformers import pipeline
        _expression_classifier = pipeline(
            "image-classification",
            model="trpakov/vit-face-expression",
            device=-1,  # CPU
        )
        logger.info("FER expression classifier loaded (trpakov/vit-face-expression)")
    except Exception as e:
        logger.warning(f"FER classifier failed to load (non-fatal): {e}")
        _expression_classifier = None

    return _expression_classifier


# ─── Blendshape groups (NFCS-mapped) ─────────────────────

# These blendshape names correspond to facial action units
# predicted by MediaPipe's neural network
DISTRESS_BLENDSHAPES = {
    # Brow tension (NFCS: brow bulge)
    "browDownLeft": 1.0,
    "browDownRight": 1.0,
    "browInnerUp": 0.6,       # Inner brow raise (worry/pain)

    # Eye squeeze (NFCS: eye squeeze)
    "eyeSquintLeft": 0.9,
    "eyeSquintRight": 0.9,
    "eyeBlinkLeft": 0.4,       # Tightly shut eyes
    "eyeBlinkRight": 0.4,

    # Mouth/cry (NFCS: open mouth, stretch mouth)
    "jawOpen": 0.8,
    "mouthStretchLeft": 1.0,   # Cry-stretch
    "mouthStretchRight": 1.0,
    "mouthFrownLeft": 0.9,     # Lip corner depression
    "mouthFrownRight": 0.9,
    "mouthPucker": 0.5,        # Pre-cry pucker

    # Nose/cheek (NFCS: nasolabial furrow, cheek raise)
    "noseSneerLeft": 0.7,
    "noseSneerRight": 0.7,
    "cheekSquintLeft": 0.6,
    "cheekSquintRight": 0.6,

    # Tongue (discomfort signal)
    "tongueOut": 0.5,
}

# Calm/content blendshapes (reduce distress)
CALM_BLENDSHAPES = {
    "mouthSmileLeft": 1.0,
    "mouthSmileRight": 1.0,
    "mouthDimpleLeft": 0.3,
    "mouthDimpleRight": 0.3,
}

# ─── Need pattern signatures ─────────────────────────────
# Each need has a signature of blendshape patterns + expression

NEED_PATTERNS = {
    "hungry": {
        "blendshape_signals": {
            "mouthPucker": 0.5,        # Sucking reflex
            "jawOpen": 0.4,            # Rooting/opening
            "mouthStretchLeft": 0.3,
            "mouthStretchRight": 0.3,
            "mouthFrownLeft": 0.4,
            "mouthFrownRight": 0.4,
        },
        "expression_boost": {"sad": 0.4, "angry": 0.3},
        "distress_range": (0.3, 0.8),
        "weight": 1.0,
    },
    "pain": {
        "blendshape_signals": {
            "eyeSquintLeft": 0.6,      # Eyes squeezed shut
            "eyeSquintRight": 0.6,
            "browDownLeft": 0.5,       # Deep brow furrow
            "browDownRight": 0.5,
            "browInnerUp": 0.4,        # Brow bulge
            "noseSneerLeft": 0.5,      # Nasolabial furrow
            "noseSneerRight": 0.5,
            "mouthStretchLeft": 0.6,   # Wide cry
            "mouthStretchRight": 0.6,
            "jawOpen": 0.5,
        },
        "expression_boost": {"angry": 0.5, "fear": 0.4, "disgust": 0.3},
        "distress_range": (0.6, 1.0),
        "weight": 1.2,  # Pain gets higher priority
    },
    "sleepy": {
        "blendshape_signals": {
            "eyeBlinkLeft": 0.5,       # Heavy/drooping eyelids
            "eyeBlinkRight": 0.5,
            "jawOpen": 0.3,            # Yawning
            "mouthFrownLeft": 0.2,
            "mouthFrownRight": 0.2,
        },
        "expression_boost": {"sad": 0.3, "neutral": 0.2},
        "distress_range": (0.15, 0.55),
        "weight": 0.9,
    },
    "diaper": {
        "blendshape_signals": {
            "mouthFrownLeft": 0.4,
            "mouthFrownRight": 0.4,
            "noseSneerLeft": 0.4,      # Disgust/discomfort
            "noseSneerRight": 0.4,
            "browDownLeft": 0.3,
            "browDownRight": 0.3,
            "cheekSquintLeft": 0.3,
            "cheekSquintRight": 0.3,
        },
        "expression_boost": {"disgust": 0.5, "sad": 0.3, "angry": 0.2},
        "distress_range": (0.25, 0.70),
        "weight": 1.0,
    },
    "calm": {
        "blendshape_signals": {
            "mouthSmileLeft": 0.3,
            "mouthSmileRight": 0.3,
        },
        "expression_boost": {"happy": 0.6, "neutral": 0.5},
        "distress_range": (0.0, 0.20),
        "weight": 0.8,
    },
}


def _extract_blendshapes(raw_blendshapes) -> dict[str, float]:
    """Convert MediaPipe blendshape list to a clean dict.

    Each blendshape has .category_name and .score (0.0–1.0).
    """
    result = {}
    for bs in raw_blendshapes:
        name = bs.category_name
        if name and name != "_neutral":
            result[name] = round(float(bs.score), 4)
    return result


def _compute_distress_from_blendshapes(blendshapes: dict[str, float]) -> float:
    """Compute distress score from ML-predicted blendshape coefficients.

    Uses weighted sum of distress-indicating blendshapes minus calm ones.
    All values are neural network predictions (0.0–1.0 per AU).
    """
    # Distress contribution
    distress_sum = 0.0
    distress_max_sum = 0.0
    for name, importance in DISTRESS_BLENDSHAPES.items():
        score = blendshapes.get(name, 0.0)
        distress_sum += score * importance
        distress_max_sum += importance

    # Calm contribution (reduces distress)
    calm_sum = 0.0
    calm_max_sum = 0.0
    for name, importance in CALM_BLENDSHAPES.items():
        score = blendshapes.get(name, 0.0)
        calm_sum += score * importance
        calm_max_sum += importance

    if distress_max_sum == 0:
        return 0.0

    # Normalize distress (0–1)
    raw_distress = distress_sum / distress_max_sum

    # Subtract calm influence (0–1)
    calm_factor = (calm_sum / calm_max_sum) if calm_max_sum > 0 else 0.0

    # Final score: distress dampened by calmness
    score = raw_distress - (calm_factor * 0.5)
    return round(min(max(score, 0.0), 1.0), 4)


def _classify_expression(image: Image.Image) -> dict[str, Any] | None:
    """Run FER expression classifier on the image.

    Returns dict with 'label', 'score', and 'all_expressions'.
    Returns None if classifier unavailable.
    """
    classifier = _load_expression_classifier()
    if classifier is None:
        return None

    try:
        results = classifier(image)
        if not results:
            return None

        all_expressions = {}
        for r in results:
            all_expressions[r["label"]] = round(r["score"], 4)

        top = results[0]
        return {
            "label": top["label"],
            "score": round(top["score"], 4),
            "all_expressions": all_expressions,
        }
    except Exception as e:
        logger.warning(f"Expression classification failed (non-fatal): {e}")
        return None


def _predict_need_from_face(
    blendshapes: dict[str, float],
    distress_score: float,
    expression: dict[str, Any] | None,
) -> dict[str, Any]:
    """Predict the most likely baby need from face signals.

    Uses blendshape pattern matching + expression classification
    to score each possible need.
    """
    need_scores: dict[str, float] = {label: 0.0 for label in NEED_LABELS}

    for need_name, pattern in NEED_PATTERNS.items():
        score = 0.0

        # 1. Blendshape signal matching (60% of signal)
        bs_signals = pattern["blendshape_signals"]
        if bs_signals:
            match_score = 0.0
            for bs_name, threshold in bs_signals.items():
                actual = blendshapes.get(bs_name, 0.0)
                if actual >= threshold:
                    match_score += actual
                else:
                    # Partial credit for being close
                    match_score += actual * (actual / max(threshold, 0.01))
            max_possible = sum(1.0 + t for t in bs_signals.values())
            score += 0.60 * (match_score / max(max_possible, 0.01))

        # 2. Expression boost (25% of signal)
        if expression and expression.get("all_expressions"):
            expr_boost = 0.0
            for expr_name, boost_weight in pattern.get("expression_boost", {}).items():
                expr_score = expression["all_expressions"].get(expr_name, 0.0)
                expr_boost += expr_score * boost_weight
            score += 0.25 * min(expr_boost, 1.0)

        # 3. Distress range match (15% of signal)
        d_min, d_max = pattern["distress_range"]
        if d_min <= distress_score <= d_max:
            # Perfect range match
            range_center = (d_min + d_max) / 2.0
            range_width = d_max - d_min
            closeness = 1.0 - abs(distress_score - range_center) / max(range_width / 2, 0.01)
            score += 0.15 * min(max(closeness, 0.0), 1.0)

        # Apply need weight
        need_scores[need_name] = score * pattern.get("weight", 1.0)

    # Normalize
    total = sum(need_scores.values())
    if total > 0:
        need_scores = {k: round(v / total, 4) for k, v in need_scores.items()}
    else:
        # Fallback: uniform with slight calm bias
        need_scores = {k: 0.2 for k in NEED_LABELS}

    # Sort and pick top
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


def _get_top_blendshapes(blendshapes: dict[str, float], n: int = 8) -> dict[str, float]:
    """Get the N most activated blendshapes (for display)."""
    sorted_bs = sorted(blendshapes.items(), key=lambda x: x[1], reverse=True)
    return {name: score for name, score in sorted_bs[:n] if score > 0.01}


def decode_image(data: str | bytes) -> Image.Image:
    """Decode base64 string or raw bytes into a PIL Image."""
    if isinstance(data, str):
        # Strip data URI prefix if present
        if "," in data:
            data = data.split(",", 1)[1]
        raw = base64.b64decode(data)
    else:
        raw = data
    return Image.open(io.BytesIO(raw)).convert("RGB")


def analyze_face(image: Image.Image) -> dict[str, Any]:
    """Full ML pipeline: detect face → extract blendshapes → classify expression → predict need.

    Uses TWO neural networks:
    1. MediaPipe FaceLandmarker → 52 blendshape coefficients (action units)
    2. ViT FER classifier → facial expression label

    Returns:
    - distress_score (0.0–1.0) from blendshape analysis
    - need_label from face-only pattern matching
    - expression label from FER model
    - top blendshape activations
    """
    import mediapipe as mp

    landmarker = _load_face_landmarker()

    # Convert PIL → numpy array, then to MediaPipe Image
    img_array = np.array(image)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_array)

    # Run detection
    result = landmarker.detect(mp_image)

    if not result.face_landmarks:
        return {
            "success": False,
            "error": "no_face_detected",
            "message": "No face detected in the image. Please try again with a clearer photo of your baby's face.",
        }

    # ── 1. Extract ML-predicted blendshapes ──────────────────
    blendshapes = {}
    if result.face_blendshapes and len(result.face_blendshapes) > 0:
        blendshapes = _extract_blendshapes(result.face_blendshapes[0])
    else:
        logger.warning("Face detected but no blendshapes returned")

    # ── 2. Compute distress score from blendshapes ───────────
    distress_score = _compute_distress_from_blendshapes(blendshapes)

    # ── 3. Run expression classifier (secondary model) ───────
    expression = _classify_expression(image)

    # Fuse expression into distress if available
    if expression:
        expr_distress = EXPRESSION_DISTRESS.get(expression["label"], 0.3)
        # 70% blendshape distress + 30% expression distress
        fused_distress = distress_score * 0.70 + expr_distress * 0.30
        distress_score = round(min(max(fused_distress, 0.0), 1.0), 4)

    # ── 4. Predict need from face ────────────────────────────
    need_prediction = _predict_need_from_face(blendshapes, distress_score, expression)

    # ── 5. Get top blendshapes for display ───────────────────
    top_features = _get_top_blendshapes(blendshapes)

    # Classify intensity level
    if distress_score < 0.15:
        intensity = "calm"
    elif distress_score < 0.30:
        intensity = "mild"
    elif distress_score < 0.50:
        intensity = "moderate"
    elif distress_score < 0.70:
        intensity = "high"
    else:
        intensity = "severe"

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
        # Expression (from FER model)
        "expression": expression["label"] if expression else None,
        "expression_confidence": expression["score"] if expression else None,
        # Top blendshape activations (for UI display)
        "stress_features": top_features,
        "faces_detected": len(result.face_landmarks),
    }
