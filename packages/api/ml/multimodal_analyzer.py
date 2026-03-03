"""Multimodal need analyzer — fuses audio + face + context for need prediction.

For video files:
1. Extracts key frames at regular intervals
2. Extracts audio track
3. Runs face distress analyzer on best frame
4. Runs audio need classifier on audio track
5. Incorporates contextual metadata (last feed, last diaper, last nap)
6. Combines with weighted fusion: audio 70%, face 15%, context 15%

For audio-only or image-only inputs, partial fusion is used.
"""

import logging
import tempfile
import subprocess
from datetime import datetime, timezone
from typing import Any
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)

# Need labels for the system
NEED_LABELS = ["hungry", "diaper", "sleepy", "pain", "calm"]

# Fusion weights
AUDIO_WEIGHT = 0.70
FACE_WEIGHT = 0.15
CONTEXT_WEIGHT = 0.15


def extract_frames_from_video(video_path: str, max_frames: int = 5) -> list[Image.Image]:
    """Extract key frames from a video using ffmpeg."""
    frames = []
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            output_pattern = str(Path(tmpdir) / "frame_%03d.jpg")
            cmd = [
                "ffmpeg", "-i", video_path,
                "-vf", f"fps=1,select='lt(n\\,{max_frames})'",
                "-vsync", "vfn",
                "-q:v", "2",
                output_pattern,
                "-y", "-loglevel", "error",
            ]
            subprocess.run(cmd, timeout=30, capture_output=True)

            for f in sorted(Path(tmpdir).glob("frame_*.jpg")):
                frames.append(Image.open(f).convert("RGB").copy())

    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        logger.warning(f"Frame extraction failed: {e}")

    return frames


def extract_audio_from_video(video_path: str) -> str | None:
    """Extract audio track from video to a temp wav file."""
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


def compute_context_scores(context: dict | None) -> dict[str, float]:
    """Compute need likelihood adjustments based on contextual metadata.

    Context includes:
    - last_feed_at: timestamp of last feed
    - last_diaper_at: timestamp of last diaper change
    - last_nap_at: timestamp of last nap

    Returns per-need adjustment scores (0.0–1.0).
    """
    if not context:
        return {label: 0.2 for label in NEED_LABELS}  # Uniform prior

    now = datetime.now(timezone.utc)
    scores = {label: 0.1 for label in NEED_LABELS}

    # Hungry: increases with time since last feed
    if context.get("last_feed_at"):
        try:
            last_feed = datetime.fromisoformat(str(context["last_feed_at"]))
            if last_feed.tzinfo is None:
                last_feed = last_feed.replace(tzinfo=timezone.utc)
            hours_since_feed = (now - last_feed).total_seconds() / 3600
            # Babies typically feed every 2-4 hours
            if hours_since_feed > 3:
                scores["hungry"] = min(0.9, 0.3 + (hours_since_feed - 3) * 0.15)
            elif hours_since_feed > 2:
                scores["hungry"] = 0.3
        except (ValueError, TypeError):
            pass

    # Diaper: increases with time since last change
    if context.get("last_diaper_at"):
        try:
            last_diaper = datetime.fromisoformat(str(context["last_diaper_at"]))
            if last_diaper.tzinfo is None:
                last_diaper = last_diaper.replace(tzinfo=timezone.utc)
            hours_since_diaper = (now - last_diaper).total_seconds() / 3600
            # Typical diaper change every 2-3 hours
            if hours_since_diaper > 2.5:
                scores["diaper"] = min(0.9, 0.3 + (hours_since_diaper - 2.5) * 0.2)
            elif hours_since_diaper > 1.5:
                scores["diaper"] = 0.25
        except (ValueError, TypeError):
            pass

    # Sleepy: increases with time since last nap
    if context.get("last_nap_at"):
        try:
            last_nap = datetime.fromisoformat(str(context["last_nap_at"]))
            if last_nap.tzinfo is None:
                last_nap = last_nap.replace(tzinfo=timezone.utc)
            hours_since_nap = (now - last_nap).total_seconds() / 3600
            # Toddlers need naps every 3-5 hours
            if hours_since_nap > 4:
                scores["sleepy"] = min(0.9, 0.3 + (hours_since_nap - 4) * 0.15)
            elif hours_since_nap > 3:
                scores["sleepy"] = 0.3
        except (ValueError, TypeError):
            pass

    # Normalize
    total = sum(scores.values())
    if total > 0:
        scores = {k: round(v / total, 4) for k, v in scores.items()}

    return scores


def fuse_predictions(
    audio_result: dict | None,
    face_result: dict | None,
    context: dict | None = None,
) -> dict[str, Any]:
    """Fuse audio need prediction + face distress + context into final prediction.

    Weights: audio 70%, face 15%, context 15%.
    When a modality is missing, its weight is redistributed.
    """
    # Compute context scores
    context_scores = compute_context_scores(context)

    # Track which modalities we have
    has_audio = audio_result and audio_result.get("success")
    has_face = face_result and face_result.get("success")

    if not has_audio and not has_face:
        # Context-only fallback
        sorted_needs = sorted(context_scores.items(), key=lambda x: x[1], reverse=True)
        return {
            "success": True,
            "modality": "context_only",
            "need_label": sorted_needs[0][0],
            "confidence": round(sorted_needs[0][1], 4),
            "secondary_need": sorted_needs[1][0] if len(sorted_needs) > 1 else None,
            "all_needs": context_scores,
            "fusion_weights": {"context": 1.0},
            "warning": "No audio or face data available. Prediction based on context only.",
        }

    # Determine effective weights based on available modalities
    if has_audio and has_face:
        w_audio, w_face, w_ctx = AUDIO_WEIGHT, FACE_WEIGHT, CONTEXT_WEIGHT
    elif has_audio:
        w_audio, w_face, w_ctx = 0.85, 0.0, 0.15
    else:
        w_audio, w_face, w_ctx = 0.0, 0.40, 0.60  # Face-only is weak for needs

    # Start with zeros
    fused_scores = {label: 0.0 for label in NEED_LABELS}

    # Audio contribution
    if has_audio:
        audio_needs = audio_result.get("all_needs", {})
        for label in NEED_LABELS:
            fused_scores[label] += w_audio * audio_needs.get(label, 0.0)

    # Face contribution — distress amplifies non-calm needs
    if has_face:
        distress = face_result.get("distress_score", 0.0)
        # High distress redistributes face weight away from "calm"
        for label in NEED_LABELS:
            if label == "calm":
                fused_scores[label] += w_face * (1.0 - distress)
            else:
                # Distribute distress evenly among non-calm needs
                fused_scores[label] += w_face * (distress / 4.0)

    # Context contribution
    for label in NEED_LABELS:
        fused_scores[label] += w_ctx * context_scores.get(label, 0.0)

    # Normalize
    total = sum(fused_scores.values())
    if total > 0:
        fused_scores = {k: round(v / total, 4) for k, v in fused_scores.items()}

    # Sort by score
    sorted_needs = sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
    primary_need = sorted_needs[0][0]
    primary_confidence = sorted_needs[0][1]
    secondary_need = sorted_needs[1][0] if len(sorted_needs) > 1 else None

    # Build description
    from ml.audio_analyzer import NEED_DESCRIPTIONS
    description = NEED_DESCRIPTIONS.get(primary_need, f"Detected: {primary_need}")

    modality = "combined" if has_audio and has_face else ("voice" if has_audio else "face")

    result = {
        "success": True,
        "modality": modality,
        "need_label": primary_need,
        "need_description": description,
        "confidence": round(primary_confidence, 4),
        "secondary_need": secondary_need,
        "all_needs": fused_scores,
        "fusion_weights": {
            "audio": round(w_audio, 2),
            "face": round(w_face, 2),
            "context": round(w_ctx, 2),
        },
    }

    # Attach sub-results for transparency
    if has_audio:
        result["audio_analysis"] = {
            "need_label": audio_result.get("need_label"),
            "confidence": audio_result.get("confidence"),
            "audio_features": audio_result.get("audio_features"),
        }
        result["spectrogram_b64"] = audio_result.get("spectrogram_b64")

    if has_face:
        result["face_analysis"] = {
            "distress_score": face_result.get("distress_score"),
            "distress_intensity": face_result.get("distress_intensity"),
            "stress_features": face_result.get("stress_features"),
        }

    if context:
        result["context_used"] = context

    return result


def analyze_video(
    video_data: bytes,
    filename: str = "video.mp4",
    context: dict | None = None,
) -> dict[str, Any]:
    """Analyze a video for baby need detection using audio + face + context.

    Extracts frames + audio, runs both pipelines, fuses results.
    """
    from ml.face_analyzer import analyze_face
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
        best_face = None
        for frame in frames:
            result = analyze_face(frame)
            if result.get("success"):
                if best_face is None or result["distress_score"] > best_face["distress_score"]:
                    best_face = result
        face_result = best_face

    # Extract and analyze audio
    audio_path = extract_audio_from_video(video_path)
    if audio_path:
        audio_result = analyze_audio_file(audio_path)
        if not audio_result.get("success"):
            audio_result = None
        try:
            Path(audio_path).unlink()
        except OSError:
            pass

    # Clean up temp video
    try:
        Path(video_path).unlink()
    except OSError:
        pass

    # Fuse all signals
    result = fuse_predictions(audio_result, face_result, context)
    if frames:
        result["frames_analyzed"] = len(frames)

    return result
