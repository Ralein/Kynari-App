"""Voice Lullaby Studio API router — TTS, lullaby library, voice selection."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from middleware.auth import get_current_user
from models.voice import (
    VoiceInfo,
    VoicePreference,
    VoicePreferenceUpdate,
    LullabyInfo,
    LullabyGenerateRequest,
    LullabyGenerateResponse,
    SpeakRequest,
    SpeakResponse,
)
from services import voice_studio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])


# ─── Voice Endpoints ─────────────────────────────────────────


@router.get("/voices", response_model=list[VoiceInfo])
async def list_voices(user: dict = Depends(get_current_user)):
    """List all available Kokoro TTS voices."""
    return voice_studio.list_voices()


@router.get("/preference", response_model=VoicePreference | None)
async def get_preference(user: dict = Depends(get_current_user)):
    """Get saved voice preference for the authenticated parent."""
    pref = voice_studio.get_voice_preference(user["user_id"])
    if not pref:
        return VoicePreference(
            parent_id=user["user_id"],
            selected_voice="af_sarah",
            label="Default",
        )
    return pref


@router.post("/preference", response_model=VoicePreference)
async def save_preference(
    request: VoicePreferenceUpdate,
    user: dict = Depends(get_current_user),
):
    """Save or update voice preference."""
    # Validate voice ID exists
    voice = voice_studio.get_voice(request.selected_voice)
    if not voice:
        raise HTTPException(status_code=400, detail=f"Unknown voice: {request.selected_voice}")

    result = voice_studio.save_voice_preference(
        parent_id=user["user_id"],
        selected_voice=request.selected_voice,
        label=request.label,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to save preference")
    return result


# ─── Lullaby Endpoints ───────────────────────────────────────


@router.get("/lullabies", response_model=list[LullabyInfo])
async def list_lullabies(
    mood: str | None = Query(None, description="Filter by mood: calm, sleepy, comfort, playful"),
    user: dict = Depends(get_current_user),
):
    """List available lullabies, optionally filtered by mood."""
    return voice_studio.list_lullabies(mood)


@router.post("/generate")
async def generate_lullaby(
    request: LullabyGenerateRequest,
    user: dict = Depends(get_current_user),
):
    """Generate a lullaby with Kokoro TTS. Returns audio/wav stream."""
    audio_bytes = await voice_studio.generate_lullaby_audio(
        voice_id=request.voice_id,
        lullaby_id=request.lullaby_id,
    )

    if not audio_bytes:
        raise HTTPException(
            status_code=503,
            detail="TTS generation failed. Kokoro model may not be installed.",
        )

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'inline; filename="{request.lullaby_id}_{request.voice_id}.wav"',
        },
    )


@router.post("/speak")
async def speak_text(
    request: SpeakRequest,
    user: dict = Depends(get_current_user),
):
    """Generate speech from arbitrary text using Kokoro TTS.

    Used for picture book read-aloud.
    """
    if len(request.text) > 2000:
        raise HTTPException(status_code=400, detail="Text too long (max 2000 chars)")

    audio_bytes = await voice_studio.generate_speech(
        voice_id=request.voice_id,
        text=request.text,
    )

    if not audio_bytes:
        raise HTTPException(
            status_code=503,
            detail="TTS generation failed. Kokoro model may not be installed.",
        )

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'inline; filename="speech.wav"',
        },
    )
