"""Analyze routes — audio, image, and video baby need analysis endpoints."""

import logging
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

from models.schemas import (
    NeedPredictionResponse,
    FaceDistressResponse,
    SaveNeedResultRequest,
    SaveResultResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


# ─── Constants ──────────────────────────────────────────────

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_AUDIO_TYPES = {
    "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
    "audio/mp4", "audio/m4a", "audio/ogg", "audio/webm",
}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


# ─── Endpoints ──────────────────────────────────────────────


@router.post("/audio", response_model=NeedPredictionResponse)
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    """Analyze baby cry audio for need classification.

    Accepts: WAV, MP3, M4A, OGG, WebM audio
    Returns: Primary need, confidence, secondary need, spectrogram, audio features
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
        return NeedPredictionResponse(**result)
    except RuntimeError as e:
        logger.error(f"Audio analysis error: {e}")
        return NeedPredictionResponse(
            success=False,
            error="model_unavailable",
            message="Audio analysis model is loading. Please try again in a moment.",
        )
    except Exception as e:
        logger.error(f"Unexpected audio analysis error: {e}")
        return NeedPredictionResponse(
            success=False,
            error="analysis_failed",
            message="Failed to analyze audio. Please try again.",
        )


@router.post("/image", response_model=FaceDistressResponse)
async def analyze_image_endpoint(file: UploadFile = File(...)):
    """Analyze a baby face image for distress scoring.

    Accepts: JPEG, PNG, WebP, GIF
    Returns: Distress score (0–1), stress features (mouth, eyes, brows)

    NOTE: Face analysis is a secondary signal. It does NOT predict needs directly.
    Use the /audio or /video endpoints for full need prediction.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Accepted: JPEG, PNG, WebP, GIF",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 25MB")

    try:
        from ml.face_analyzer import decode_image, analyze_face
        image = decode_image(data)
        result = analyze_face(image)
        return FaceDistressResponse(**result)
    except RuntimeError as e:
        logger.error(f"Image analysis error: {e}")
        return FaceDistressResponse(
            success=False,
            error="model_unavailable",
            message="Face analysis model is loading. Please try again in a moment.",
        )
    except Exception as e:
        logger.error(f"Unexpected image analysis error: {e}")
        return FaceDistressResponse(
            success=False,
            error="analysis_failed",
            message="Failed to analyze image. Please try a different photo.",
        )


@router.post("/video", response_model=NeedPredictionResponse)
async def analyze_video_endpoint(
    file: UploadFile = File(...),
    child_id: str | None = Form(None),
):
    """Analyze a video of a baby for combined audio + face need prediction.

    Accepts: MP4, WebM, QuickTime
    Returns: Fused need prediction from audio + face + context signals

    Optionally provide child_id to include contextual metadata (last feed, etc.)
    in the fusion.
    """
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Accepted: MP4, WebM, MOV",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 25MB")

    # Fetch context if child_id provided
    context = None
    if child_id:
        try:
            from database import fetch_one
            context = fetch_one(
                "SELECT last_feed_at, last_diaper_at, last_nap_at FROM context_log WHERE child_id = %s",
                (child_id,),
            )
        except Exception as e:
            logger.warning(f"Failed to fetch context for child {child_id}: {e}")

    try:
        from ml.multimodal_analyzer import analyze_video
        result = analyze_video(data, filename=file.filename or "video.mp4", context=context)
        return NeedPredictionResponse(**result)
    except RuntimeError as e:
        logger.error(f"Video analysis error: {e}")
        return NeedPredictionResponse(
            success=False,
            error="model_unavailable",
            message="Analysis models are loading. Please try again in a moment.",
        )
    except Exception as e:
        logger.error(f"Unexpected video analysis error: {e}")
        return NeedPredictionResponse(
            success=False,
            error="analysis_failed",
            message="Failed to analyze video. Please try again.",
        )


@router.post("/save", response_model=SaveResultResponse)
async def save_analysis_result(body: SaveNeedResultRequest):
    """Save a need analysis result to the child's need timeline.

    Call this after the user reviews a prediction and wants to store it.
    """
    from database import get_pool
    import json

    session_id = str(uuid4())
    event_id = str(uuid4())
    now = datetime.now(timezone.utc)

    pool = get_pool()
    with pool.connection() as conn:
        conn.execute(
            """
            INSERT INTO need_events
                (id, child_id, session_id, need_label, confidence, secondary_need,
                 modality, audio_features, face_distress_score, all_needs, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (event_id, body.child_id, session_id, body.need_label,
             body.confidence, body.secondary_need, body.modality,
             json.dumps(body.audio_features) if body.audio_features else None,
             body.face_distress_score,
             json.dumps(body.all_needs) if body.all_needs else None,
             now),
        )
        conn.commit()

    # Trigger baseline recalculation (async-safe)
    try:
        from services.baseline_engine import need_baseline_engine
        await need_baseline_engine.ingest_events(body.child_id, [{
            "need_label": body.need_label,
            "confidence": body.confidence,
            "modality": body.modality,
            "timestamp": now.isoformat(),
        }])
    except Exception as e:
        logger.warning(f"Need baseline update failed: {e}")

    return SaveResultResponse(
        success=True,
        event_id=event_id,
        session_id=session_id,
    )
