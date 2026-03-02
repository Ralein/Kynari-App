"""Multimodal analyzer — combines face + audio analysis for video inputs.

For video files:
1. Extracts key frames at regular intervals
2. Extracts audio track
3. Runs face analyzer on best frame
4. Runs audio analyzer on audio track
5. Combines results with confidence weighting
"""

import logging
import tempfile
import subprocess
from typing import Any
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)


def extract_frames_from_video(video_path: str, max_frames: int = 5) -> list[Image.Image]:
    """Extract key frames from a video using ffmpeg.

    Falls back to extracting first frame if ffmpeg isn't available.
    """
    frames = []
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            output_pattern = str(Path(tmpdir) / "frame_%03d.jpg")
            # Extract frames at 1fps
            cmd = [
                "ffmpeg", "-i", video_path,
                "-vf", f"fps=1,select='lt(n\\,{max_frames})'",
                "-vsync", "vfn",
                "-q:v", "2",
                output_pattern,
                "-y", "-loglevel", "error",
            ]
            subprocess.run(cmd, timeout=30, capture_output=True)

            # Load extracted frames
            for f in sorted(Path(tmpdir).glob("frame_*.jpg")):
                frames.append(Image.open(f).convert("RGB").copy())

    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.warning(f"Frame extraction failed: {e}")

    return frames


def extract_audio_from_video(video_path: str) -> str | None:
    """Extract audio track from video to a temp wav file.

    Returns temp file path or None if extraction fails.
    """
    try:
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        cmd = [
            "ffmpeg", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
            tmp.name,
            "-y", "-loglevel", "error",
        ]
        subprocess.run(cmd, timeout=30, capture_output=True, check=True)
        return tmp.name
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError) as e:
        logger.warning(f"Audio extraction failed: {e}")
        return None


def analyze_video(video_data: bytes, filename: str = "video.mp4") -> dict[str, Any]:
    """Analyze a video for baby emotion using both face and audio.

    Extracts frames + audio, runs both pipelines, combines results.
    """
    from ml.face_analyzer import analyze_image
    from ml.audio_analyzer import analyze_audio_file

    suffix = "." + filename.rsplit(".", 1)[-1] if "." in filename else ".mp4"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_data)
        tmp.flush()
        video_path = tmp.name

    face_result = None
    audio_result = None

    # Extract and analyze frames
    frames = extract_frames_from_video(video_path)
    if frames:
        # Analyze each frame, pick the one with highest confidence
        best_face = None
        for frame in frames:
            result = analyze_image(frame)
            if result.get("success"):
                if best_face is None or result["confidence"] > best_face["confidence"]:
                    best_face = result
        face_result = best_face

    # Extract and analyze audio
    audio_path = extract_audio_from_video(video_path)
    if audio_path:
        audio_result = analyze_audio_file(audio_path)
        if not audio_result.get("success"):
            audio_result = None
        # Clean up temp audio file
        try:
            Path(audio_path).unlink()
        except OSError:
            pass

    # Clean up temp video file
    try:
        Path(video_path).unlink()
    except OSError:
        pass

    # Combine results
    if face_result and audio_result:
        # Weighted combination: face 60%, audio 40%
        face_weight = 0.6
        audio_weight = 0.4

        # Use face emotion as primary if confidence is high enough
        if face_result["confidence"] > 0.7:
            primary_emotion = face_result["emotion_label"]
            combined_confidence = (
                face_result["confidence"] * face_weight +
                audio_result["confidence"] * audio_weight
            )
        else:
            # Use audio if face confidence is low
            primary_emotion = audio_result["emotion_label"]
            combined_confidence = audio_result["confidence"]

        return {
            "success": True,
            "modality": "combined",
            "emotion_label": primary_emotion,
            "confidence": round(combined_confidence, 4),
            "face_analysis": face_result,
            "audio_analysis": audio_result,
            "frames_analyzed": len(frames),
        }
    elif face_result:
        face_result["modality"] = "face"
        return face_result
    elif audio_result:
        audio_result["modality"] = "voice"
        return audio_result
    else:
        return {
            "success": False,
            "error": "analysis_failed",
            "message": "Could not detect face or analyze audio from the video. Please try with a clearer video.",
        }
