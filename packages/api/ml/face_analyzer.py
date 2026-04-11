"""Face distress analyzer — MediaPipe Face Mesh baby distress detection.

Pipeline:
1. Face detection + 468 3D landmark extraction via MediaPipe Face Mesh
2. Compute NFCS-aligned geometric features from landmarks
3. Score infant distress from action unit activations
4. Predict likely baby need from distress profile
5. Quality gate: reject poor photos with actionable user feedback

Dependencies: mediapipe, numpy, Pillow

Based on:
  - NFCS (Neonatal Facial Coding System) — Grunau & Craig, 1987
  - FACS (Facial Action Coding System) — Ekman & Friesen, 1978
  - MediaPipe Face Mesh — 468 3D landmarks, 15ms inference
"""

import logging
import math
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ─── Lazy-loaded singleton ────────────────────────────────
_face_mesh = None

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

# ─── MediaPipe landmark indices (canonical face mesh) ─────
# Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png

# Mouth landmarks
UPPER_LIP_TOP = 13        # Top center of upper lip
LOWER_LIP_BOTTOM = 14     # Bottom center of lower lip
MOUTH_LEFT = 61            # Left corner of mouth
MOUTH_RIGHT = 291          # Right corner of mouth
UPPER_LIP_OUTER_LEFT = 39
UPPER_LIP_OUTER_RIGHT = 269

# Eye landmarks
LEFT_EYE_TOP = 159         # Top of left eye
LEFT_EYE_BOTTOM = 145      # Bottom of left eye
RIGHT_EYE_TOP = 386        # Top of right eye
RIGHT_EYE_BOTTOM = 374     # Bottom of right eye
LEFT_EYE_INNER = 133       # Inner corner left eye
LEFT_EYE_OUTER = 33        # Outer corner left eye
RIGHT_EYE_INNER = 362      # Inner corner right eye
RIGHT_EYE_OUTER = 263      # Outer corner right eye

# Eyebrow landmarks
LEFT_BROW_INNER = 107      # Inner left brow
LEFT_BROW_OUTER = 70       # Outer left brow
LEFT_BROW_MID = 105        # Mid left brow
RIGHT_BROW_INNER = 336     # Inner right brow
RIGHT_BROW_OUTER = 300     # Outer right brow
RIGHT_BROW_MID = 334       # Mid right brow

# Nose landmarks
NOSE_TIP = 1               # Tip of nose
NOSE_BRIDGE = 6            # Bridge of nose (between eyes)

# Chin
CHIN_TIP = 152             # Bottom of chin
CHIN_LEFT = 176            # Left chin
CHIN_RIGHT = 400           # Right chin

# Nasolabial fold approximation (cheek near nose)
LEFT_CHEEK_NOSE = 36       # Left nasolabial area
RIGHT_CHEEK_NOSE = 266     # Right nasolabial area
LEFT_CHEEK_LOW = 50        # Lower left cheek
RIGHT_CHEEK_LOW = 280      # Lower right cheek

# Face outline (for face size reference)
FACE_TOP = 10              # Top of forehead
FACE_BOTTOM = 152          # Bottom of chin (same as CHIN_TIP)
FACE_LEFT = 234            # Left side
FACE_RIGHT = 454           # Right side


def _ensure_face_mesh():
    """Lazy-load MediaPipe Face Mesh on first use."""
    global _face_mesh
    if _face_mesh is not None:
        return _face_mesh

    try:
        import mediapipe as mp
        _face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,   # Enables iris landmarks for better eye tracking
            min_detection_confidence=0.3,  # Lower threshold for infant faces
            min_tracking_confidence=0.3,
        )
        logger.info("MediaPipe Face Mesh loaded successfully")
        return _face_mesh
    except ImportError as e:
        raise RuntimeError(
            "MediaPipe is not installed. Run: pip install mediapipe"
        ) from e


# ─── Geometry helpers ─────────────────────────────────────

def _dist(a: np.ndarray, b: np.ndarray) -> float:
    """Euclidean distance between two 3D points."""
    return float(np.linalg.norm(a - b))


def _midpoint(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Midpoint of two 3D points."""
    return (a + b) / 2.0


def _landmarks_to_array(landmarks, w: int, h: int) -> np.ndarray:
    """Convert MediaPipe landmarks to a (468, 3) numpy array in pixel coords."""
    pts = np.zeros((len(landmarks.landmark), 3), dtype=np.float64)
    for i, lm in enumerate(landmarks.landmark):
        pts[i] = [lm.x * w, lm.y * h, lm.z * w]  # z is scaled to image width
    return pts


# ─── Geometric feature extraction (NFCS-aligned) ─────────

def _extract_geometric_features(pts: np.ndarray) -> dict[str, float]:
    """Extract NFCS-aligned facial action unit proxies from 468 landmarks.

    Features are normalized by face height/width so they're scale-invariant.

    Returns dict of feature_name → activation (0.0 to 1.0)
    """
    # Reference distances for normalization
    face_height = _dist(pts[FACE_TOP], pts[FACE_BOTTOM])
    face_width = _dist(pts[FACE_LEFT], pts[FACE_RIGHT])

    if face_height < 1.0 or face_width < 1.0:
        return {}

    features = {}

    # ── AU27: Mouth Opening ─────────────────────────────
    # Vertical mouth opening / face height
    mouth_open_dist = _dist(pts[UPPER_LIP_TOP], pts[LOWER_LIP_BOTTOM])
    mouth_width = _dist(pts[MOUTH_LEFT], pts[MOUTH_RIGHT])
    mouth_aspect_ratio = mouth_open_dist / max(mouth_width, 1.0)
    # Normalize: infant closed mouth ~0.05, wide cry ~0.5+
    features["mouth_opening"] = min(max(mouth_aspect_ratio / 0.55, 0.0), 1.0)

    # ── AU4: Brow Lowering ──────────────────────────────
    # Distance from brow to eye / face height (lower = more lowered)
    left_brow_eye = _dist(pts[LEFT_BROW_MID], pts[LEFT_EYE_TOP])
    right_brow_eye = _dist(pts[RIGHT_BROW_MID], pts[RIGHT_EYE_TOP])
    avg_brow_eye = (left_brow_eye + right_brow_eye) / 2.0
    brow_eye_ratio = avg_brow_eye / face_height
    # Inverted: smaller distance = more furrowed = higher activation
    # Typical range: 0.08 (very furrowed) to 0.15 (relaxed)
    features["brow_furrow"] = min(max(1.0 - (brow_eye_ratio - 0.06) / 0.10, 0.0), 1.0)

    # ── Inner brow raise/pull (AU1) ─────────────────────
    # Distance between inner brow points / face width
    inner_brow_dist = _dist(pts[LEFT_BROW_INNER], pts[RIGHT_BROW_INNER])
    inner_brow_ratio = inner_brow_dist / face_width
    # Closer inner brows = more distress (pulled together)
    # Range: ~0.15 (pulled together) to ~0.25 (relaxed)
    features["inner_brow_pull"] = min(max(1.0 - (inner_brow_ratio - 0.12) / 0.15, 0.0), 1.0)

    # ── AU6+AU7: Eye Squeeze ────────────────────────────
    # Eye aspect ratio (EAR) — lower = more squeezed
    left_ear = _dist(pts[LEFT_EYE_TOP], pts[LEFT_EYE_BOTTOM]) / max(_dist(pts[LEFT_EYE_INNER], pts[LEFT_EYE_OUTER]), 1.0)
    right_ear = _dist(pts[RIGHT_EYE_TOP], pts[RIGHT_EYE_BOTTOM]) / max(_dist(pts[RIGHT_EYE_INNER], pts[RIGHT_EYE_OUTER]), 1.0)
    avg_ear = (left_ear + right_ear) / 2.0
    # Inverted: smaller EAR = more squeezed = higher activation
    # Range: ~0.15 (squeezed shut) to ~0.35 (wide open)
    features["eye_squeeze"] = min(max(1.0 - (avg_ear - 0.10) / 0.30, 0.0), 1.0)

    # ── AU15: Lip Corner Depression ─────────────────────
    # Vertical position of mouth corners relative to mouth center
    mouth_center_y = (pts[UPPER_LIP_TOP][1] + pts[LOWER_LIP_BOTTOM][1]) / 2.0
    left_corner_depression = (pts[MOUTH_LEFT][1] - mouth_center_y) / face_height
    right_corner_depression = (pts[MOUTH_RIGHT][1] - mouth_center_y) / face_height
    avg_depression = (left_corner_depression + right_corner_depression) / 2.0
    # Positive = corners below center = frown
    features["lip_corner_down"] = min(max(avg_depression / 0.04 + 0.2, 0.0), 1.0)

    # ── AU17: Chin Raise ────────────────────────────────
    # Distance from lower lip to chin / face height
    lip_chin_dist = _dist(pts[LOWER_LIP_BOTTOM], pts[CHIN_TIP])
    lip_chin_ratio = lip_chin_dist / face_height
    # Shorter distance = chin pushed up (quivering chin)
    # Range: ~0.15 (chin raised) to ~0.25 (relaxed)
    features["chin_raise"] = min(max(1.0 - (lip_chin_ratio - 0.12) / 0.12, 0.0), 1.0)

    # ── Nasolabial furrow depth ─────────────────────────
    # Approximated by distance from cheek-nose junction to nose tip
    left_nl = _dist(pts[LEFT_CHEEK_NOSE], pts[NOSE_TIP])
    right_nl = _dist(pts[RIGHT_CHEEK_NOSE], pts[NOSE_TIP])
    avg_nl = (left_nl + right_nl) / 2.0
    nl_ratio = avg_nl / face_width
    # Deepened furrows = higher activation
    features["nasolabial_furrow"] = min(max((nl_ratio - 0.15) / 0.15, 0.0), 1.0)

    # ── Face symmetry (distress indicator) ──────────────
    left_side_dist = _dist(pts[FACE_LEFT], pts[NOSE_TIP])
    right_side_dist = _dist(pts[FACE_RIGHT], pts[NOSE_TIP])
    asymmetry = abs(left_side_dist - right_side_dist) / face_width
    features["face_asymmetry"] = min(asymmetry / 0.10, 1.0)

    # Round all features
    features = {k: round(v, 4) for k, v in features.items()}

    return features


# ─── Distress scoring from geometric features ────────────

# Weights for each feature in distress computation (NFCS-aligned)
FEATURE_DISTRESS_WEIGHTS = {
    "mouth_opening":    0.25,  # Wide-open mouth is the strongest cry indicator
    "brow_furrow":      0.18,  # Furrowed brows = pain/discomfort
    "inner_brow_pull":  0.12,  # Pulled inner brows = distress
    "eye_squeeze":      0.15,  # Squeezed eyes = pain
    "lip_corner_down":  0.10,  # Downturned mouth = sadness
    "chin_raise":       0.10,  # Quivering chin = about to cry
    "nasolabial_furrow": 0.07, # Deepened folds = crying
    "face_asymmetry":   0.03,  # Slight asymmetry increase in distress
}


def _compute_distress_from_geometry(features: dict[str, float]) -> float:
    """Compute distress score from geometric facial features.

    Uses NFCS-weighted combination of action unit activations.
    Returns 0.0 (calm) to 1.0 (extreme distress).
    """
    if not features:
        return 0.2  # Default mild uncertainty

    distress = 0.0
    total_weight = 0.0

    for feat_name, weight in FEATURE_DISTRESS_WEIGHTS.items():
        activation = features.get(feat_name, 0.0)
        distress += weight * activation
        total_weight += weight

    if total_weight > 0:
        distress = distress / total_weight

    # Apply infant calibration curve
    # Infants have less dynamic range — stretch the mid-range
    calibrated = min(distress * 1.2, 1.0) ** 0.8

    return round(min(max(calibrated, 0.0), 1.0), 4)


# ─── Need prediction from geometric features ─────────────

# Each need has a profile of which action units are most indicative
NEED_GEOMETRY_PROFILES = {
    "pain": {
        "feature_weights": {
            "mouth_opening": 0.30,
            "brow_furrow": 0.25,
            "eye_squeeze": 0.25,
            "chin_raise": 0.10,
            "nasolabial_furrow": 0.10,
        },
        "distress_range": (0.45, 1.0),
        "weight": 1.15,
    },
    "hungry": {
        "feature_weights": {
            "mouth_opening": 0.35,    # Rooting, mouth open
            "lip_corner_down": 0.20,  # Frown
            "brow_furrow": 0.15,
            "chin_raise": 0.15,       # Quivering chin
            "eye_squeeze": 0.05,
        },
        "distress_range": (0.20, 0.65),
        "weight": 1.0,
    },
    "sleepy": {
        "feature_weights": {
            "eye_squeeze": 0.35,      # Droopy/heavy eyes
            "lip_corner_down": 0.15,
            "mouth_opening": 0.10,    # Yawning
            "brow_furrow": 0.05,
        },
        "distress_range": (0.05, 0.40),
        "weight": 0.90,
    },
    "diaper": {
        "feature_weights": {
            "brow_furrow": 0.25,
            "lip_corner_down": 0.25,
            "mouth_opening": 0.15,
            "nasolabial_furrow": 0.15,
            "face_asymmetry": 0.10,
        },
        "distress_range": (0.20, 0.60),
        "weight": 1.0,
    },
    "calm": {
        "feature_weights": {
            "mouth_opening": -0.30,   # Closed mouth = calm (negative weight)
            "eye_squeeze": -0.20,     # Open eyes = calm
            "brow_furrow": -0.20,     # Relaxed brow = calm
        },
        "distress_range": (0.0, 0.20),
        "weight": 0.85,
    },
}


def _predict_need_from_geometry(
    features: dict[str, float],
    distress_score: float,
) -> dict[str, Any]:
    """Predict baby need from geometric facial features."""
    need_scores: dict[str, float] = {label: 0.0 for label in NEED_LABELS}

    for need_name, profile in NEED_GEOMETRY_PROFILES.items():
        score = 0.0

        # 1. Feature profile matching (60%)
        feat_match = 0.0
        for feat_name, weight in profile["feature_weights"].items():
            activation = features.get(feat_name, 0.0)
            if weight < 0:
                # Negative weight: low activation is good
                feat_match += abs(weight) * (1.0 - activation)
            else:
                feat_match += weight * activation
        score += 0.60 * min(feat_match * 1.8, 1.0)

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
    import base64
    import io

    if isinstance(data, str):
        if "," in data:
            data = data.split(",", 1)[1]
        raw = base64.b64decode(data)
    else:
        raw = data
    return Image.open(io.BytesIO(raw)).convert("RGB")


# ─── Human-friendly feature labels ───────────────────────

FEATURE_DISPLAY_NAMES = {
    "mouth_opening": "Mouth Opening (AU27)",
    "brow_furrow": "Brow Lowering (AU4)",
    "inner_brow_pull": "Inner Brow Pull (AU1)",
    "eye_squeeze": "Eye Squeeze (AU6+7)",
    "lip_corner_down": "Lip Corner Depression (AU15)",
    "chin_raise": "Chin Raise (AU17)",
    "nasolabial_furrow": "Nasolabial Furrow (AU11)",
    "face_asymmetry": "Facial Asymmetry",
}


# ─── Main entry point ─────────────────────────────────────

def analyze_face(image: Image.Image) -> dict[str, Any]:
    """Full ML pipeline: detect face → landmarks → geometry → distress → need.

    Uses MediaPipe Face Mesh for 468-point 3D landmark detection,
    then computes NFCS-aligned geometric features for infant distress
    scoring.

    Quality gate:
      - No face detected → actionable error message
      - Image too small → suggestion to retake photo

    Distress scale:
      0.00-0.10 calm      0.10-0.25 mild        0.25-0.45 moderate
      0.45-0.65 high      0.65-0.85 severe       0.85-1.00 worst
    """
    face_mesh = _ensure_face_mesh()

    # Convert PIL → numpy array for MediaPipe
    img_array = np.array(image)

    # Validate minimum image dimensions
    h, w = img_array.shape[:2]
    if h < 48 or w < 48:
        return {
            "success": False,
            "error": "poor_quality",
            "message": QUALITY_ERROR_MESSAGES["poor_quality"],
        }

    # ── 1. Run MediaPipe Face Mesh ────────────────────────────
    try:
        results = face_mesh.process(img_array)
    except Exception as e:
        logger.error(f"MediaPipe Face Mesh failed: {e}")
        return {
            "success": False,
            "error": "analysis_failed",
            "message": (
                "Face analysis encountered an error. Please try again "
                "with a different photo."
            ),
        }

    # Check if any face was detected
    if not results.multi_face_landmarks:
        return {
            "success": False,
            "error": "no_face_detected",
            "message": QUALITY_ERROR_MESSAGES["no_face"],
        }

    # Take the first (and only, since max_num_faces=1) face
    face_landmarks = results.multi_face_landmarks[0]

    # ── 2. Convert landmarks to pixel coordinates ─────────────
    pts = _landmarks_to_array(face_landmarks, w, h)

    # ── 3. Check face region quality ──────────────────────────
    face_bbox_w = pts[:, 0].max() - pts[:, 0].min()
    face_bbox_h = pts[:, 1].max() - pts[:, 1].min()

    if face_bbox_w < 30 or face_bbox_h < 30:
        return {
            "success": False,
            "error": "poor_quality",
            "message": QUALITY_ERROR_MESSAGES["poor_quality"],
        }

    # ── 4. Extract geometric features (NFCS-aligned) ─────────
    geometric_features = _extract_geometric_features(pts)

    if not geometric_features:
        return {
            "success": False,
            "error": "poor_quality",
            "message": QUALITY_ERROR_MESSAGES["poor_quality"],
        }

    # ── 5. Compute distress score from geometry ───────────────
    distress_score = _compute_distress_from_geometry(geometric_features)

    # ── 6. Predict need from geometry + distress ──────────────
    need_prediction = _predict_need_from_geometry(geometric_features, distress_score)

    # ── 7. Build display-friendly stress features ─────────────
    # Sort by activation, keep top 5
    stress_features = {}
    sorted_feats = sorted(geometric_features.items(), key=lambda x: x[1], reverse=True)
    for name, score in sorted_feats[:6]:
        display_name = FEATURE_DISPLAY_NAMES.get(name, name)
        if score > 0.05:
            stress_features[display_name] = score

    # ── 8. Determine dominant expression from features ────────
    # Map geometric patterns to expression labels
    if distress_score >= 0.6:
        if geometric_features.get("mouth_opening", 0) > 0.5:
            expression = "crying"
        elif geometric_features.get("brow_furrow", 0) > 0.5:
            expression = "angry"
        else:
            expression = "distressed"
    elif distress_score >= 0.3:
        if geometric_features.get("lip_corner_down", 0) > 0.4:
            expression = "sad"
        elif geometric_features.get("mouth_opening", 0) > 0.3:
            expression = "fussy"
        else:
            expression = "uncomfortable"
    elif distress_score >= 0.1:
        expression = "neutral"
    else:
        if geometric_features.get("mouth_opening", 0) < 0.1:
            expression = "calm"
        else:
            expression = "content"

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
        # Expression (from geometric analysis)
        "expression": expression,
        "expression_confidence": round(1.0 - abs(distress_score - 0.5) * 0.5, 4),
        # Top action unit activations (for UI display)
        "stress_features": stress_features,
        "faces_detected": 1,
        # Raw geometric features for debugging/fusion
        "geometric_features": geometric_features,
    }