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


@router.api_route("/generate", methods=["GET", "POST"])
async def generate_lullaby(
    request_data: LullabyGenerateRequest | None = None,
    voice_id: str | None = Query(None),
    lullaby_id: str | None = Query(None),
    speed: float | None = Query(None, description="Speech rate (0.5 to 2.0). Defaults to 0.85 for lullabies."),
    user: dict = Depends(get_current_user),
):
    """Generate a lullaby with Kokoro TTS. Returns audio/wav stream."""
    v_id = voice_id
    l_id = lullaby_id
    # Default speed for lullabies is 0.85 (soothing)
    v_speed = speed if speed is not None else 0.85

    if request_data:
        v_id = v_id or request_data.voice_id
        l_id = l_id or request_data.lullaby_id

    if not v_id or not l_id:
        raise HTTPException(status_code=400, detail="Missing voice_id or lullaby_id")

    audio_bytes = await voice_studio.generate_lullaby_audio(
        voice_id=v_id,
        lullaby_id=l_id,
        speed=v_speed,
    )

    if not audio_bytes:
        raise HTTPException(
            status_code=503,
            detail="TTS generation failed. Verify model files and voice ID.",
        )

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'inline; filename="{l_id}_{v_id}.wav"',
            "X-Speech-Rate": str(v_speed),
        },
    )


@router.api_route("/speak", methods=["GET", "POST"])
async def speak_text(
    request_data: SpeakRequest | None = None,
    voice_id: str | None = Query(None),
    text: str | None = Query(None),
    speed: float | None = Query(None, description="Speech rate (0.5 to 2.0). Defaults to 1.0 for speech."),
    user: dict = Depends(get_current_user),
):
    """Generate speech from arbitrary text using Kokoro TTS."""
    v_id = voice_id
    t_text = text
    # Default speed for speech is 1.0 (natural)
    v_speed = speed if speed is not None else 1.0

    if request_data:
        v_id = v_id or request_data.voice_id
        t_text = t_text or request_data.text

    if not v_id or not t_text:
        raise HTTPException(status_code=400, detail="Missing voice_id or text")

    if len(t_text) > 2000:
        raise HTTPException(status_code=400, detail="Text too long (max 2000 chars)")

    audio_bytes = await voice_studio.generate_speech(
        voice_id=v_id,
        text=t_text,
        speed=v_speed,
    )

    if not audio_bytes:
        raise HTTPException(
            status_code=503,
            detail="TTS generation failed. Verify model files and voice ID.",
        )

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'inline; filename="speech.wav"',
            "X-Speech-Rate": str(v_speed),
        },
    )
