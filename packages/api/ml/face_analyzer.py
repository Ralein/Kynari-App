"""Face distress analyzer — detects baby face and computes a stress/distress score.

Pipeline:
1. Face detection via MediaPipe Face Mesh
2. Extract facial landmarks
3. Compute stress features: mouth_openness, eye_squint, brow_tension
4. Output a single distress_score (0.0 = calm, 1.0 = maximum distress)

This is a SECONDARY signal — it does NOT predict needs on its own.
It provides supplementary data to the multimodal fusion module.
"""

import io
import base64
import logging
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy-loaded singleton
_face_mesh = None


def _load_face_mesh():
    """Lazy-load MediaPipe Face Mesh."""
    global _face_mesh
    if _face_mesh is None:
        try:
            import mediapipe as mp
            _face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
            )
            logger.info("MediaPipe Face Mesh loaded")
        except Exception as e:
            logger.error(f"Failed to load MediaPipe Face Mesh: {e}")
            raise RuntimeError("Face mesh unavailable") from e
    return _face_mesh


# ─── Landmark Indices (MediaPipe 468-point mesh) ──────────────

# Mouth landmarks
UPPER_LIP_TOP = 13
LOWER_LIP_BOTTOM = 14
LEFT_MOUTH_CORNER = 61
RIGHT_MOUTH_CORNER = 291

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

# Nose tip (reference point)
NOSE_TIP = 1


def _landmark_distance(landmarks, idx_a: int, idx_b: int) -> float:
    """Euclidean distance between two landmarks."""
    a = landmarks[idx_a]
    b = landmarks[idx_b]
    return float(np.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2))


def _compute_mouth_openness(landmarks) -> float:
    """How open the mouth is (0.0 = closed, 1.0 = wide open).

    Ratio of vertical mouth opening to horizontal mouth width.
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

    Inverse of eye opening ratio.
    """
    left_v = _landmark_distance(landmarks, LEFT_EYE_TOP, LEFT_EYE_BOTTOM)
    right_v = _landmark_distance(landmarks, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM)
    avg_opening = (left_v + right_v) / 2.0
    # Normalize: typical range 0.01 (shut) to 0.05 (wide open)
    openness = min(max((avg_opening - 0.005) / 0.045, 0.0), 1.0)
    return float(1.0 - openness)  # Invert: squint = 1.0 means eyes shut


def _compute_brow_tension(landmarks) -> float:
    """How furrowed/tense the brows are (0.0 = relaxed, 1.0 = very tense).

    Measured by how close inner brow points are to nose bridge.
    """
    left_inner = _landmark_distance(landmarks, LEFT_BROW_INNER, NOSE_TIP)
    right_inner = _landmark_distance(landmarks, RIGHT_BROW_INNER, NOSE_TIP)
    avg_dist = (left_inner + right_inner) / 2.0
    # Normalize: typical range 0.08 (furrowed/close) to 0.15 (raised/relaxed)
    relaxation = min(max((avg_dist - 0.06) / 0.09, 0.0), 1.0)
    return float(1.0 - relaxation)  # Invert: tension = 1.0 means very furrowed


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

    Returns distress_score (0.0–1.0) and individual stress features.
    Does NOT predict needs — this is a secondary signal for the fusion module.
    """
    face_mesh = _load_face_mesh()

    # Convert PIL → numpy array for MediaPipe
    img_array = np.array(image)
    results = face_mesh.process(img_array)

    if not results.multi_face_landmarks:
        return {
            "success": False,
            "error": "no_face_detected",
            "message": "No face detected in the image. Please try again with a clearer photo of your baby's face.",
        }

    # Use first (largest/most confident) face
    landmarks = results.multi_face_landmarks[0].landmark

    # Compute stress features
    mouth_openness = _compute_mouth_openness(landmarks)
    eye_squint = _compute_eye_squint(landmarks)
    brow_tension = _compute_brow_tension(landmarks)

    # Weighted distress score
    # Mouth openness is strongest indicator of crying
    distress_score = (
        mouth_openness * 0.50 +
        eye_squint * 0.30 +
        brow_tension * 0.20
    )
    distress_score = round(min(max(distress_score, 0.0), 1.0), 4)

    # Classify intensity level
    if distress_score < 0.2:
        intensity = "calm"
    elif distress_score < 0.4:
        intensity = "mild"
    elif distress_score < 0.6:
        intensity = "moderate"
    elif distress_score < 0.8:
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
            "brow_tension": round(brow_tension, 4),
        },
        "faces_detected": len(results.multi_face_landmarks),
    }
