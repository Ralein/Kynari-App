"""Face emotion analyzer — detects baby faces and classifies emotions.

Pipeline:
1. Face detection via MTCNN (lightweight, no GPU required)
2. Emotion classification via ViT (trpakov/vit-face-expression)

Falls back gracefully if models aren't downloaded yet.
"""

import io
import base64
import logging
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy-loaded singletons
_face_detector = None
_emotion_classifier = None

# Emotion label mapping — ViT FER model outputs these 7 classes
VIT_EMOTION_LABELS = [
    "angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"
]

# Map ViT labels → Kynari labels
EMOTION_MAP = {
    "angry": "angry",
    "disgust": "frustrated",
    "fear": "fearful",
    "happy": "happy",
    "neutral": "neutral",
    "sad": "sad",
    "surprise": "happy",   # babies surprised ≈ happy/engaged
}


def _load_face_detector():
    """Lazy-load MTCNN face detector."""
    global _face_detector
    if _face_detector is None:
        try:
            from facenet_pytorch import MTCNN
            _face_detector = MTCNN(
                keep_all=True,
                min_face_size=40,
                thresholds=[0.6, 0.7, 0.7],
                device="cpu",
            )
            logger.info("MTCNN face detector loaded")
        except Exception as e:
            logger.error(f"Failed to load MTCNN: {e}")
            raise RuntimeError("Face detector unavailable") from e
    return _face_detector


def _load_emotion_classifier():
    """Lazy-load ViT emotion classifier from HuggingFace."""
    global _emotion_classifier
    if _emotion_classifier is None:
        try:
            from transformers import pipeline
            _emotion_classifier = pipeline(
                "image-classification",
                model="trpakov/vit-face-expression",
                device=-1,  # CPU
            )
            logger.info("ViT emotion classifier loaded")
        except Exception as e:
            logger.error(f"Failed to load emotion classifier: {e}")
            raise RuntimeError("Emotion classifier unavailable") from e
    return _emotion_classifier


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


def detect_faces(image: Image.Image) -> list[dict[str, Any]]:
    """Detect faces in an image, return bounding boxes + probabilities."""
    detector = _load_face_detector()
    boxes, probs = detector.detect(image)

    if boxes is None:
        return []

    faces = []
    for box, prob in zip(boxes, probs):
        x1, y1, x2, y2 = [int(c) for c in box]
        faces.append({
            "bbox": [x1, y1, x2, y2],
            "detection_confidence": float(prob),
        })
    return faces


def classify_emotion(face_crop: Image.Image) -> dict[str, Any]:
    """Classify emotion from a cropped face image."""
    classifier = _load_emotion_classifier()
    results = classifier(face_crop)

    # results is a list of {label, score} sorted by score descending
    all_emotions = {}
    for r in results:
        kynari_label = EMOTION_MAP.get(r["label"], r["label"])
        # Merge duplicate mappings (e.g. both "surprise" and "happy" → "happy")
        if kynari_label in all_emotions:
            all_emotions[kynari_label] = max(all_emotions[kynari_label], r["score"])
        else:
            all_emotions[kynari_label] = r["score"]

    top_label = max(all_emotions, key=all_emotions.get)
    return {
        "emotion_label": top_label,
        "confidence": round(all_emotions[top_label], 4),
        "all_emotions": {k: round(v, 4) for k, v in sorted(
            all_emotions.items(), key=lambda x: x[1], reverse=True
        )},
    }


def analyze_image(image: Image.Image) -> dict[str, Any]:
    """Full pipeline: detect faces → classify emotions for each face.

    Returns the result for the largest/most-prominent face.
    """
    faces = detect_faces(image)
    if not faces:
        return {
            "success": False,
            "error": "no_face_detected",
            "message": "No face detected in the image. Please try again with a clearer photo of your baby's face.",
        }

    # Pick the largest face (biggest bounding box area)
    def face_area(f):
        b = f["bbox"]
        return (b[2] - b[0]) * (b[3] - b[1])

    faces.sort(key=face_area, reverse=True)
    best_face = faces[0]

    # Crop the face with some padding
    bbox = best_face["bbox"]
    w, h = image.size
    pad_x = int((bbox[2] - bbox[0]) * 0.15)
    pad_y = int((bbox[3] - bbox[1]) * 0.15)
    crop_box = (
        max(0, bbox[0] - pad_x),
        max(0, bbox[1] - pad_y),
        min(w, bbox[2] + pad_x),
        min(h, bbox[3] + pad_y),
    )
    face_crop = image.crop(crop_box).resize((224, 224))

    emotion = classify_emotion(face_crop)

    return {
        "success": True,
        "modality": "face",
        "emotion_label": emotion["emotion_label"],
        "confidence": emotion["confidence"],
        "all_emotions": emotion["all_emotions"],
        "face_bbox": best_face["bbox"],
        "faces_detected": len(faces),
    }
