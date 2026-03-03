"""Face distress analyzer — detects baby face and computes a stress/distress score.

Pipeline:
1. Face detection via MediaPipe FaceLandmarker (Tasks API)
2. Extract facial landmarks (478-point mesh)
3. Compute 7 stress features based on NFCS (Neonatal Facial Coding System):
   - mouth_openness      (crying indicator)
   - eye_squint           (pain indicator)
   - brow_furrow          (pain/anger indicator)
   - lip_corner_pull_down (frown / sadness)
   - chin_quiver          (chin raised and tense)
   - nose_wrinkle         (nasolabial furrow)
   - cheek_raise          (cheek bunching under eyes)
4. Output a single distress_score (0.0 = calm, 1.0 = maximum distress)

This is a SECONDARY signal — it does NOT predict needs on its own.
It provides supplementary data to the multimodal fusion module.

Based on:
  - NFCS (Neonatal Facial Coding System) — Grunau & Craig, 1987
  - FLACC (Face, Legs, Activity, Cry, Consolability) scale
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

# Lazy-loaded singleton
_face_landmarker = None

# Path to the downloaded .task model file
_MODEL_DIR = Path(__file__).parent / "models"
_MODEL_PATH = _MODEL_DIR / "face_landmarker.task"


def _load_face_landmarker():
    """Lazy-load MediaPipe FaceLandmarker (new Tasks API)."""
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
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        _face_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
        logger.info("MediaPipe FaceLandmarker loaded (Tasks API)")
    except Exception as e:
        logger.error(f"Failed to load MediaPipe FaceLandmarker: {e}")
        raise RuntimeError("Face landmarker unavailable") from e
    return _face_landmarker


# ─── Landmark Indices (MediaPipe 478-point mesh) ──────────────

# Mouth landmarks
UPPER_LIP_TOP = 13
LOWER_LIP_BOTTOM = 14
LEFT_MOUTH_CORNER = 61
RIGHT_MOUTH_CORNER = 291
LOWER_LIP_CENTER = 17        # bottom center of lower lip
UPPER_LIP_OUTER_LEFT = 39    # upper lip outer edge
UPPER_LIP_OUTER_RIGHT = 269  # upper lip outer edge

# Eye landmarks
LEFT_EYE_TOP = 159
LEFT_EYE_BOTTOM = 145
RIGHT_EYE_TOP = 386
RIGHT_EYE_BOTTOM = 374

# Brow landmarks
LEFT_BROW_INNER = 107
LEFT_BROW_OUTER = 70
RIGHT_BROW_INNER = 336
RIGHT_BROW_OUTER = 300
LEFT_BROW_MID = 105     # middle of left eyebrow
RIGHT_BROW_MID = 334    # middle of right eyebrow

# Nose landmarks
NOSE_TIP = 1
NOSE_BRIDGE_TOP = 6      # top of nose bridge between eyes
LEFT_NOSE_WING = 48       # left nostril wing
RIGHT_NOSE_WING = 278     # right nostril wing

# Cheek landmarks
LEFT_CHEEK_UPPER = 123    # under left eye (cheek bunching area)
LEFT_CHEEK_BONE = 116     # cheekbone
RIGHT_CHEEK_UPPER = 352   # under right eye
RIGHT_CHEEK_BONE = 345    # cheekbone

# Chin landmarks
CHIN_TIP = 152             # bottom of chin
CHIN_LEFT = 172            # left lower jaw
CHIN_RIGHT = 397           # right lower jaw
CHIN_CENTER = 175          # center chin (between lower lip and chin tip)

# Nasolabial fold area
LEFT_NASOLABIAL = 205      # crease line left
RIGHT_NASOLABIAL = 425     # crease line right

# Forehead reference
FOREHEAD_CENTER = 10       # center of forehead


def _landmark_distance(landmarks, idx_a: int, idx_b: int) -> float:
    """Euclidean distance between two landmarks."""
    a = landmarks[idx_a]
    b = landmarks[idx_b]
    return float(np.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2))


def _landmark_y(landmarks, idx: int) -> float:
    """Get the y-coordinate of a landmark (for vertical comparison)."""
    return float(landmarks[idx].y)


# ─── Feature Extractors ──────────────────────────────────────


def _compute_mouth_openness(landmarks) -> float:
    """How open the mouth is (0.0 = closed, 1.0 = wide open cry).

    Ratio of vertical mouth opening to horizontal mouth width.
    Strong indicator of active crying.
    """
    vertical = _landmark_distance(landmarks, UPPER_LIP_TOP, LOWER_LIP_BOTTOM)
    horizontal = _landmark_distance(landmarks, LEFT_MOUTH_CORNER, RIGHT_MOUTH_CORNER)
    if horizontal < 1e-6:
        return 0.0
    ratio = vertical / horizontal
    # Normalize: typical range 0.05 (closed) to 0.6 (wide open cry)
    return float(min(max((ratio - 0.05) / 0.55, 0.0), 1.0))


def _compute_eye_squint(landmarks) -> float:
    """How squinted/closed the eyes are (0.0 = open, 1.0 = tightly shut).

    Eyes squeezed shut is a key NFCS pain indicator.
    """
    left_v = _landmark_distance(landmarks, LEFT_EYE_TOP, LEFT_EYE_BOTTOM)
    right_v = _landmark_distance(landmarks, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM)
    avg_opening = (left_v + right_v) / 2.0
    # Normalize: typical range 0.01 (shut) to 0.05 (wide open)
    openness = min(max((avg_opening - 0.005) / 0.045, 0.0), 1.0)
    return float(1.0 - openness)  # Invert: squint = 1.0 means eyes shut


def _compute_brow_furrow(landmarks) -> float:
    """How furrowed/lowered the brows are (0.0 = relaxed, 1.0 = deeply furrowed).

    Measured by:
    1. How close inner brow points are to nose bridge (brow lowering)
    2. How close left and right inner brow points are to each other (brow pinch)

    NFCS: "Brow bulge" — bulging, creasing, and vertical furrows above
    and/or between brows.
    """
    # Inner brow to nose bridge distance (lowering)
    left_inner = _landmark_distance(landmarks, LEFT_BROW_INNER, NOSE_BRIDGE_TOP)
    right_inner = _landmark_distance(landmarks, RIGHT_BROW_INNER, NOSE_BRIDGE_TOP)
    avg_lower_dist = (left_inner + right_inner) / 2.0
    # Normalize: 0.06 (very lowered) to 0.13 (relaxed/raised)
    lowering = 1.0 - min(max((avg_lower_dist - 0.05) / 0.08, 0.0), 1.0)

    # Inner brow pinch (how close inner brows are to each other)
    brow_pinch_dist = _landmark_distance(landmarks, LEFT_BROW_INNER, RIGHT_BROW_INNER)
    # Normalize: typical range 0.04 (pinched) to 0.10 (relaxed)
    pinch = 1.0 - min(max((brow_pinch_dist - 0.03) / 0.07, 0.0), 1.0)

    # Combined: lowering is primary, pinch is secondary
    return float(min(max(lowering * 0.6 + pinch * 0.4, 0.0), 1.0))


def _compute_lip_corner_depression(landmarks) -> float:
    """How much the lip corners are pulled downward (0.0 = neutral, 1.0 = deep frown).

    Measures the vertical position of mouth corners relative to the
    center of the lips. A "U-shape" (corners down) indicates frowning/crying.

    NFCS: "Lip corner depressor" — stretching of mouth corners downward.
    """
    # Average y of mouth corners
    left_corner_y = _landmark_y(landmarks, LEFT_MOUTH_CORNER)
    right_corner_y = _landmark_y(landmarks, RIGHT_MOUTH_CORNER)
    avg_corner_y = (left_corner_y + right_corner_y) / 2.0

    # Center lip y (reference for neutral expression)
    center_lip_y = _landmark_y(landmarks, UPPER_LIP_TOP)

    # If corners are BELOW center lip → depression (frown)
    # Positive delta = corners pulled down
    delta = avg_corner_y - center_lip_y

    # Normalize: typical range 0.0 (neutral) to 0.04 (deep frown)
    return float(min(max(delta / 0.04, 0.0), 1.0))


def _compute_chin_tension(landmarks) -> float:
    """How raised/tense the chin is (0.0 = relaxed, 1.0 = very taut).

    Measured by the distance between lower lip and chin tip.
    When the chin is raised and trembling, this distance decreases.

    NFCS: "Chin quiver" — trembling or quivering of the chin.
    (We can only detect the static position, not the trembling.)
    """
    lip_to_chin = _landmark_distance(landmarks, LOWER_LIP_BOTTOM, CHIN_TIP)
    lip_to_center = _landmark_distance(landmarks, LOWER_LIP_BOTTOM, CHIN_CENTER)

    # When chin is raised/tense, the distance between lower lip and chin
    # decreases and the chin center moves closer to the lip
    # Normalize: typical range 0.03 (very tense/chin raised) to 0.08 (relaxed)
    relaxation = min(max((lip_to_chin - 0.025) / 0.055, 0.0), 1.0)
    center_tension = 1.0 - min(max((lip_to_center - 0.01) / 0.04, 0.0), 1.0)

    return float(min(max((1.0 - relaxation) * 0.6 + center_tension * 0.4, 0.0), 1.0))


def _compute_nasolabial_furrow(landmarks) -> float:
    """Depth of nasolabial fold (0.0 = smooth, 1.0 = deep furrow).

    Measured by how close the nasolabial crease points are to the
    nose wings — indicates bunching of face tissue during crying.

    NFCS: "Naso-labial furrow" — deepening of the furrow that runs
    down and outward from the nose wings.
    """
    # Distance from nose wing to nasolabial crease point
    left_furrow = _landmark_distance(landmarks, LEFT_NOSE_WING, LEFT_NASOLABIAL)
    right_furrow = _landmark_distance(landmarks, RIGHT_NOSE_WING, RIGHT_NASOLABIAL)
    avg_furrow = (left_furrow + right_furrow) / 2.0

    # When crying, cheek tissue bunches up → nasolabial points move closer to nose
    # Normalize: typical range 0.02 (deep furrow) to 0.06 (smooth)
    smoothness = min(max((avg_furrow - 0.015) / 0.045, 0.0), 1.0)
    return float(1.0 - smoothness)


def _compute_cheek_raise(landmarks) -> float:
    """How much the cheeks are raised/bunched (0.0 = relaxed, 1.0 = fully bunched).

    When crying, cheek muscles push upward under the eyes.
    Measured by the distance between upper cheek landmark and the
    cheekbone — decreases when cheeks bunch upward.
    """
    # Left cheek: distance from under-eye to cheekbone
    left_cheek = _landmark_distance(landmarks, LEFT_CHEEK_UPPER, LEFT_CHEEK_BONE)
    right_cheek = _landmark_distance(landmarks, RIGHT_CHEEK_UPPER, RIGHT_CHEEK_BONE)
    avg_cheek = (left_cheek + right_cheek) / 2.0

    # When cheeks raise, the distance between upper cheek and bone decreases
    # Normalize: typical range 0.01 (bunched) to 0.04 (relaxed)
    relaxation = min(max((avg_cheek - 0.008) / 0.032, 0.0), 1.0)
    return float(1.0 - relaxation)


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
    """Full pipeline: detect face → extract landmarks → compute distress score.

    Uses 7 NFCS-inspired stress features with weighted scoring:
      - mouth_openness      (24%): strongest single crying indicator
      - eye_squint           (18%): eyes squeezed shut (pain)
      - brow_furrow          (16%): brow bulge / vertical furrows
      - lip_corner_pull_down (14%): mouth corners pulled down (frown)
      - chin_tension         (10%): chin raised/taut (pre-cry tremor)
      - nasolabial_furrow    (10%): deepened crease beside nose
      - cheek_raise           (8%): cheek bunching under eyes

    Returns distress_score (0.0–1.0) and individual stress features.
    Does NOT predict needs — this is a secondary signal for the fusion module.
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

    # Use first face's landmarks (list of NormalizedLandmark objects)
    landmarks = result.face_landmarks[0]

    # Compute all 7 stress features
    mouth_openness = _compute_mouth_openness(landmarks)
    eye_squint = _compute_eye_squint(landmarks)
    brow_furrow = _compute_brow_furrow(landmarks)
    lip_depression = _compute_lip_corner_depression(landmarks)
    chin_tension = _compute_chin_tension(landmarks)
    nasolabial_furrow = _compute_nasolabial_furrow(landmarks)
    cheek_raise = _compute_cheek_raise(landmarks)

    # Weighted distress score (NFCS-inspired weighting)
    distress_score = (
        mouth_openness * 0.24 +
        eye_squint * 0.18 +
        brow_furrow * 0.16 +
        lip_depression * 0.14 +
        chin_tension * 0.10 +
        nasolabial_furrow * 0.10 +
        cheek_raise * 0.08
    )
    distress_score = round(min(max(distress_score, 0.0), 1.0), 4)

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
        "stress_features": {
            "mouth_openness": round(mouth_openness, 4),
            "eye_squint": round(eye_squint, 4),
            "brow_furrow": round(brow_furrow, 4),
            "lip_corner_pull_down": round(lip_depression, 4),
            "chin_tension": round(chin_tension, 4),
            "nasolabial_furrow": round(nasolabial_furrow, 4),
            "cheek_raise": round(cheek_raise, 4),
        },
        "faces_detected": len(result.face_landmarks),
    }
