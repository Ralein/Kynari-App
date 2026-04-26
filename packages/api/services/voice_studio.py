"""Voice Lullaby Studio — Kokoro TTS integration for lullabies and read-aloud.

Uses kokoro-onnx for local, free text-to-speech. No external API needed.
Voices are pre-built (~20 options). No voice cloning.
"""

import io
import logging
import re
from pathlib import Path

from database import fetch_one, execute_returning

logger = logging.getLogger(__name__)

# ─── Global Engine Cache ─────────────────────────────────────
_kokoro_engine = None

# ─── Model Paths ─────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
MODEL_PATH = BASE_DIR / "kokoro-v1.0.onnx"
VOICES_PATH = BASE_DIR / "voices-v1.0.bin"


# ─── Available Kokoro Voices ─────────────────────────────────

VOICES = [
    {"voice_id": "af_sarah", "name": "Sarah", "gender": "Female", "style": "Warm & gentle", "description": "A calm, nurturing voice perfect for bedtime."},
    {"voice_id": "af_bella", "name": "Bella", "gender": "Female", "style": "Soft & melodic", "description": "Sweet and musical, great for lullabies."},
    {"voice_id": "af_nicole", "name": "Nicole", "gender": "Female", "style": "Clear & soothing", "description": "Clear diction with a warm undertone."},
    {"voice_id": "af_sky", "name": "Sky", "gender": "Female", "style": "Airy & dreamy", "description": "Light and ethereal, like a whisper."},
    {"voice_id": "af_heart", "name": "Heart", "gender": "Female", "style": "Loving & warm", "description": "Full of warmth, like a loving embrace."},
    {"voice_id": "am_adam", "name": "Adam", "gender": "Male", "style": "Deep & calm", "description": "A deep, reassuring voice for bedtime stories."},
    {"voice_id": "am_michael", "name": "Michael", "gender": "Male", "style": "Gentle & steady", "description": "Steady and reliable, like a gentle guide."},
    {"voice_id": "bf_emma", "name": "Emma", "gender": "Female", "style": "British & warm", "description": "A warm British accent, perfect for stories."},
    {"voice_id": "bf_isabella", "name": "Isabella", "gender": "Female", "style": "British & elegant", "description": "Refined and elegant, soothing to listen to."},
    {"voice_id": "bm_george", "name": "George", "gender": "Male", "style": "British & gentle", "description": "A classic British voice, calm and composed."},
    {"voice_id": "bm_lewis", "name": "Lewis", "gender": "Male", "style": "British & deep", "description": "Rich and deep, like a warm blanket."},
]

# ─── Lullaby Catalogue (public domain) ──────────────────────

LULLABIES = [
    {
        "id": "twinkle",
        "title": "Twinkle Twinkle Little Star",
        "lyrics": "Twinkle, twinkle, little star,\nHow I wonder what you are.\nUp above the world so high,\nLike a diamond in the sky.\nTwinkle, twinkle, little star,\nHow I wonder what you are.",
        "mood": "calm",
        "origin": "English traditional",
        "duration_estimate": 45,
    },
    {
        "id": "rockabye",
        "title": "Rock-a-Bye Baby",
        "lyrics": "Rock-a-bye baby, on the treetop,\nWhen the wind blows, the cradle will rock.\nWhen the bough breaks, the cradle will fall,\nAnd down will come baby, cradle and all.\nBaby is drowsing, cozy and fair,\nMother sits near, in her rocking chair.",
        "mood": "sleepy",
        "origin": "English traditional",
        "duration_estimate": 50,
    },
    {
        "id": "hushaby",
        "title": "Hush Little Baby",
        "lyrics": "Hush little baby, don't say a word,\nMama's gonna buy you a mockingbird.\nAnd if that mockingbird won't sing,\nMama's gonna buy you a diamond ring.\nAnd if that diamond ring turns brass,\nMama's gonna buy you a looking glass.",
        "mood": "comfort",
        "origin": "American traditional",
        "duration_estimate": 55,
    },
    {
        "id": "brahms",
        "title": "Brahms' Lullaby",
        "lyrics": "Lullaby and goodnight, with roses bedight,\nWith lilies bedecked, is baby's wee bed.\nLay thee down now and rest, may thy slumber be blessed.\nLay thee down now and rest, may thy slumber be blessed.",
        "mood": "sleepy",
        "origin": "Johannes Brahms, 1868",
        "duration_estimate": 40,
    },
    {
        "id": "allnight",
        "title": "All Through the Night",
        "lyrics": "Sleep my child and peace attend thee,\nAll through the night.\nGuardian angels God will send thee,\nAll through the night.\nSoft the drowsy hours are creeping,\nHill and dale in slumber sleeping,\nI my loving vigil keeping,\nAll through the night.",
        "mood": "sleepy",
        "origin": "Welsh traditional",
        "duration_estimate": 60,
    },
    {
        "id": "baabaablack",
        "title": "Baa Baa Black Sheep",
        "lyrics": "Baa, baa, black sheep, have you any wool?\nYes sir, yes sir, three bags full.\nOne for the master, one for the dame,\nAnd one for the little boy who lives down the lane.\nBaa, baa, black sheep, have you any wool?\nYes sir, yes sir, three bags full.",
        "mood": "calm",
        "origin": "English traditional",
        "duration_estimate": 35,
    },
    {
        "id": "marylamb",
        "title": "Mary Had a Little Lamb",
        "lyrics": "Mary had a little lamb,\nLittle lamb, little lamb.\nMary had a little lamb,\nIts fleece was white as snow.\nAnd everywhere that Mary went,\nMary went, Mary went,\nEverywhere that Mary went,\nThe lamb was sure to go.",
        "mood": "playful",
        "origin": "Sarah Josepha Hale, 1830",
        "duration_estimate": 40,
    },
    {
        "id": "rowboat",
        "title": "Row Row Row Your Boat",
        "lyrics": "Row, row, row your boat,\nGently down the stream.\nMerrily, merrily, merrily, merrily,\nLife is but a dream.\nRow, row, row your boat,\nGently down the stream.\nIf you see a crocodile,\nDon't forget to scream!",
        "mood": "playful",
        "origin": "American traditional",
        "duration_estimate": 30,
    },
    {
        "id": "moonlight",
        "title": "By the Light of the Silvery Moon",
        "lyrics": "By the light of the silvery moon,\nI want to spoon.\nTo my honey I'll croon love's tune.\nHoney moon, keep a-shining in June.\nYour silvery beams will bring love's dreams,\nWe'll be cuddling soon,\nBy the silvery moon.",
        "mood": "calm",
        "origin": "Edward Madden, 1909",
        "duration_estimate": 45,
    },
    {
        "id": "goldenslumber",
        "title": "Golden Slumbers",
        "lyrics": "Golden slumbers kiss your eyes,\nSmiles await you when you rise.\nSleep, pretty darling, do not cry,\nAnd I will sing a lullaby.\nCares you know not, therefore sleep,\nWhile over you a watch I'll keep.\nSleep, pretty darling, do not cry,\nAnd I will sing a lullaby.",
        "mood": "sleepy",
        "origin": "Thomas Dekker, 1603",
        "duration_estimate": 50,
    },
]


def list_voices() -> list[dict]:
    """List available Kokoro voices."""
    return VOICES


def list_lullabies(mood: str | None = None) -> list[dict]:
    """List lullaby catalogue, optionally filtered by mood."""
    if mood:
        return [l for l in LULLABIES if l["mood"] == mood]
    return LULLABIES


def get_lullaby(lullaby_id: str) -> dict | None:
    """Get a single lullaby by ID."""
    return next((l for l in LULLABIES if l["id"] == lullaby_id), None)


def get_voice(voice_id: str) -> dict | None:
    """Get a single voice by ID."""
    return next((v for v in VOICES if v["voice_id"] == voice_id), None)


def _clean_text_for_tts(text: str) -> str:
    """Strip markdown but preserve prosody-affecting punctuation."""
    if not text:
        return ""
    # Remove markdown formatting
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    
    # Normalize whitespace but keep sentence pauses
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    
    # Trim but keep a trailing period for Kokoro prosody if it looks like a sentence
    text = text.strip()
    if text and text[-1] not in ".!?":
        text += "."
        
    return text


def _get_kokoro_engine():
    """Lazy-load the Kokoro engine to cache the 310MB model in memory."""
    global _kokoro_engine
    if _kokoro_engine is None:
        try:
            import kokoro_onnx
            import onnxruntime as ort
            
            if not MODEL_PATH.exists() or not VOICES_PATH.exists():
                logger.error(f"Kokoro model or voices file missing at {MODEL_PATH}")
                return None
            
            # Optimization: Set up session options for faster CPU inference
            sess_options = ort.SessionOptions()
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.intra_op_num_threads = 4
            
            # Create session manually to pass options
            session = ort.InferenceSession(
                str(MODEL_PATH),
                sess_options=sess_options,
                providers=["CPUExecutionProvider"]
            )
            
            _kokoro_engine = kokoro_onnx.Kokoro.from_session(
                session,
                str(VOICES_PATH)
            )
            logger.info("Kokoro engine initialized via from_session with optimizations.")
        except ImportError:
            logger.warning("kokoro-onnx or onnxruntime not installed.")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Kokoro engine: {e}")
            return None
    return _kokoro_engine


async def generate_lullaby_audio(voice_id: str, lullaby_id: str, speed: float = 0.85) -> bytes | None:
    """Generate lullaby audio using Kokoro TTS.
    
    Defaults to a slower, more soothing 0.85 speed.
    """
    lullaby = get_lullaby(lullaby_id)
    if not lullaby:
        return None

    text = _clean_text_for_tts(lullaby["lyrics"])
    kokoro = _get_kokoro_engine()
    if not kokoro:
        return None

    try:
        import soundfile as sf
        samples, sample_rate = kokoro.create(text, voice=voice_id, speed=speed, lang="en-us")

        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="WAV")
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Lullaby generation failed: {e}")
        return None


def generate_lullaby_stream(voice_id: str, lullaby_id: str, speed: float = 0.85):
    """Generate a stream of audio chunks for a lullaby."""
    lullaby = get_lullaby(lullaby_id)
    if not lullaby: return
    
    text = _clean_text_for_tts(lullaby["lyrics"])
    kokoro = _get_kokoro_engine()
    if not kokoro: return

    import soundfile as sf
    for samples, sample_rate in kokoro.create_stream(text, voice=voice_id, speed=speed, lang="en-us"):
        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="WAV")
        yield buf.getvalue()


async def generate_speech(voice_id: str, text: str, speed: float = 1.0) -> bytes | None:
    """Generate speech from text (for picture books). Default speed 1.0."""
    text = _clean_text_for_tts(text)
    kokoro = _get_kokoro_engine()
    if not kokoro:
        return None

    try:
        import soundfile as sf
        samples, sample_rate = kokoro.create(text, voice=voice_id, speed=speed, lang="en-us")

        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="WAV")
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Speech generation failed: {e}")
        return None


def generate_speech_stream(voice_id: str, text: str, speed: float = 1.0):
    """Stream speech chunks for text."""
    text = _clean_text_for_tts(text)
    kokoro = _get_kokoro_engine()
    if not kokoro: return

    import soundfile as sf
    for samples, sample_rate in kokoro.create_stream(text, voice=voice_id, speed=speed, lang="en-us"):
        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="WAV")
        yield buf.getvalue()


# ─── Preference Management ───────────────────────────────────

def get_voice_preference(parent_id: str) -> dict | None:
    """Get saved voice preference for a parent."""
    return fetch_one(
        """
        SELECT parent_id, selected_voice, label, updated_at
        FROM voice_preferences
        WHERE parent_id = %s
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (parent_id,),
    )


def save_voice_preference(parent_id: str, selected_voice: str, label: str = "Default") -> dict | None:
    """Save or update voice preference (upsert)."""
    existing = get_voice_preference(parent_id)
    if existing:
        return execute_returning(
            """
            UPDATE voice_preferences
            SET selected_voice = %s, label = %s, updated_at = now()
            WHERE parent_id = %s
            RETURNING parent_id, selected_voice, label, updated_at
            """,
            (selected_voice, label, parent_id),
        )
    else:
        return execute_returning(
            """
            INSERT INTO voice_preferences (parent_id, selected_voice, label)
            VALUES (%s, %s, %s)
            RETURNING parent_id, selected_voice, label, updated_at
            """,
            (parent_id, selected_voice, label),
        )
