"""Analyze routes — image, audio, and video emotion analysis endpoints."""

import logging
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


# ─── Response Models ────────────────────────────────────────

class AnalyzeImageResponse(BaseModel):
    success: bool
    modality: str | None = None
    emotion_label: str | None = None
    confidence: float | None = None
    all_emotions: dict[str, float] | None = None
    face_bbox: list[int] | None = None
    faces_detected: int | None = None
    error: str | None = None
    message: str | None = None


class AnalyzeAudioResponse(BaseModel):
    success: bool
    modality: str | None = None
    cry_reason: str | None = None
    cry_description: str | None = None
    emotion_label: str | None = None
    confidence: float | None = None
    all_classes: dict[str, float] | None = None
    audio_duration_seconds: float | None = None
    error: str | None = None
    message: str | None = None


class AnalyzeVideoResponse(BaseModel):
    success: bool
    modality: str | None = None
    emotion_label: str | None = None
    confidence: float | None = None
    face_analysis: dict | None = None
    audio_analysis: dict | None = None
    frames_analyzed: int | None = None
    error: str | None = None
    message: str | None = None


class SaveResultRequest(BaseModel):
    child_id: str
    emotion_label: str
    confidence: float
    modality: str
    raw_result: dict | None = None


class SaveResultResponse(BaseModel):
    success: bool
    event_id: str
    session_id: str


# ─── Endpoints ──────────────────────────────────────────────

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_AUDIO_TYPES = {
    "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
    "audio/mp4", "audio/m4a", "audio/ogg", "audio/webm",
}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.post("/image", response_model=AnalyzeImageResponse)
async def analyze_image_endpoint(file: UploadFile = File(...)):
    """Analyze a baby face image for emotion detection.

    Accepts: JPEG, PNG, WebP, GIF
    Returns: Detected emotion, confidence, face bounding box
    """
    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Accepted: JPEG, PNG, WebP, GIF",
        )

    # Read file data
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 25MB")

    try:
        from ml.face_analyzer import decode_image, analyze_image
        image = decode_image(data)
        result = analyze_image(image)
        return AnalyzeImageResponse(**result)
    except RuntimeError as e:
        logger.error(f"Image analysis error: {e}")
        return AnalyzeImageResponse(
            success=False,
            error="model_unavailable",
            message="Emotion analysis model is loading. Please try again in a moment.",
        )
    except Exception as e:
        logger.error(f"Unexpected image analysis error: {e}")
        return AnalyzeImageResponse(
            success=False,
            error="analysis_failed",
            message="Failed to analyze image. Please try a different photo.",
        )


@router.post("/audio", response_model=AnalyzeAudioResponse)
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    """Analyze baby cry audio for emotion/need classification.

    Accepts: WAV, MP3, M4A, OGG, WebM audio
    Returns: Cry reason, mapped emotion, confidence
    """
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Accepted: WAV, MP3, M4A, OGG",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 25MB")

    try:
        from ml.audio_analyzer import analyze_audio_bytes
        result = analyze_audio_bytes(data, filename=file.filename or "audio.wav")
        return AnalyzeAudioResponse(**result)
    except RuntimeError as e:
        logger.error(f"Audio analysis error: {e}")
        return AnalyzeAudioResponse(
            success=False,
            error="model_unavailable",
            message="Audio analysis model is loading. Please try again in a moment.",
        )
    except Exception as e:
        logger.error(f"Unexpected audio analysis error: {e}")
        return AnalyzeAudioResponse(
            success=False,
            error="analysis_failed",
            message="Failed to analyze audio. Please try again.",
        )


@router.post("/video", response_model=AnalyzeVideoResponse)
async def analyze_video_endpoint(file: UploadFile = File(...)):
    """Analyze a video of a baby for combined face + audio emotion.

    Accepts: MP4, WebM, QuickTime
    Returns: Combined emotion from face + audio analysis
    """
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Accepted: MP4, WebM, MOV",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 25MB")

    try:
        from ml.multimodal_analyzer import analyze_video
        result = analyze_video(data, filename=file.filename or "video.mp4")
        return AnalyzeVideoResponse(**result)
    except RuntimeError as e:
        logger.error(f"Video analysis error: {e}")
        return AnalyzeVideoResponse(
            success=False,
            error="model_unavailable",
            message="Analysis models are loading. Please try again in a moment.",
        )
    except Exception as e:
        logger.error(f"Unexpected video analysis error: {e}")
        return AnalyzeVideoResponse(
            success=False,
            error="analysis_failed",
            message="Failed to analyze video. Please try again.",
        )


@router.post("/save", response_model=SaveResultResponse)
async def save_analysis_result(body: SaveResultRequest):
    """Save an analysis result as an emotion event for a child.

    Call this after the user reviews an analysis result and wants to
    store it in the child's emotion timeline.
    """
    from database import get_pool
    from services.baseline_engine import baseline_engine

    session_id = str(uuid4())
    event_id = str(uuid4())
    now = datetime.now(timezone.utc)

    pool = get_pool()
    with pool.connection() as conn:
        # Insert into emotion_events
        conn.execute(
            """
            INSERT INTO emotion_events (id, child_id, session_id, emotion_label, confidence, modality, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (event_id, body.child_id, session_id, body.emotion_label,
             body.confidence, body.modality, now),
        )

        # Insert into analysis_sessions if raw_result provided
        if body.raw_result:
            import json
            conn.execute(
                """
                INSERT INTO analysis_sessions (child_id, parent_id, modality, raw_result, emotion_label, confidence)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (body.child_id, "system", body.modality,
                 json.dumps(body.raw_result), body.emotion_label, body.confidence),
            )

        conn.commit()

    # Trigger baseline recalculation
    try:
        baseline_engine.ingest_events(body.child_id, [{
            "emotion_label": body.emotion_label,
            "confidence": body.confidence,
            "modality": body.modality,
            "timestamp": now.isoformat(),
        }])
    except Exception as e:
        logger.warning(f"Baseline update failed: {e}")

    return SaveResultResponse(
        success=True,
        event_id=event_id,
        session_id=session_id,
    )
