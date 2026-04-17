# Kynari — Phase 2: Care Playbook Suite

> **Implementation Plan · v1.0**
> Builds on the Phase 1 detection pipeline. Phase 2 closes the loop: once a need is identified, Kynari actively helps the parent respond to it via the Playbook.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature 1 — Voice Lullaby Studio](#2-feature-1--voice-lullaby-studio)
3. [Feature 2 — AI Picture Book](#3-feature-2--ai-picture-book)
4. [Feature 3 — Care Playbook](#4-feature-3--care-playbook)
5. [Feature 4 — Sleep Soundscape](#5-feature-4--sleep-soundscape)
6. [Feature 5 — Memory Garden](#6-feature-5--memory-garden)
7. [Database Schema Extensions](#7-database-schema-extensions)
8. [API Surface — New Endpoints](#8-api-surface--new-endpoints)
9. [Monorepo Structure Changes](#9-monorepo-structure-changes)
10. [Tech Stack Additions](#10-tech-stack-additions)
11. [Implementation Phases & Timeline](#11-implementation-phases--timeline)
12. [Privacy & Ethics Additions](#12-privacy--ethics-additions)
13. [Performance Targets](#13-performance-targets)
14. [Open Questions & Risks](#14-open-questions--risks)

---

## 1. Overview

Phase 1 answers: **"What does my baby need?"**
Phase 2 answers: **"Now what do I do?"**

The Care Playbook Suite is a collection of five AI-powered response tools that activate immediately after a need is detected. Each feature is independent and can be shipped incrementally. They share a common foundation: the `child_id`, the detected need, and the parent's feedback history.

### Design Principles

- **Response, not just reporting.** Every insight surfaces an action.
- **Personalised from day one.** Each feature reads from and writes to the child's history.
- **Privacy mirrors Phase 1.** No raw audio leaves the device. Voice embeddings are stored encrypted, never the raw voice recording.
- **Graceful degradation.** Every feature has a fallback that works offline (generic lullaby, static story, generic care plan, preset soundscape).

### How Phase 2 Connects to Phase 1

```
Phase 1 Output
──────────────
{ need: "Hungry", confidence: 0.67, child_id: "uuid" }
        │
        ▼
Phase 2 Trigger (client-side)
──────────────────────────────
confidence >= 0.55  →  open Care Playbook panel
        │
        ├──► Feature 1: Voice Lullaby  (if need = Sleepy | Calm)
        ├──► Feature 2: Picture Book   (on-demand, any state)
        ├──► Feature 3: Care Playbook  (ranked plan for detected need)
        ├──► Feature 4: Sleep Soundscape (if need = Sleepy | Calm)
        └──► Feature 5: Memory Garden  (passive, always recording milestones)
```

---

## 2. Feature 1 — Voice Lullaby Studio

### Concept

A parent records 3 short voice samples (10–30 seconds each). Kynari creates a voice clone and renders classic lullabies in that voice. When the baby is distressed and no parent is present, the device plays a lullaby in mom's or dad's actual voice.

### User Flow

```
1. Parent opens Voice Studio  →  prompted to record 3 samples
2. Sample 1: speak naturally for 10–30s
3. Sample 2: hum a tune for 10–30s
4. Sample 3: read a nursery rhyme for 10–30s
5. Upload → voice embedding created server-side → raw audio deleted immediately
6. Parent browses lullaby library (24+ titles, 5 categories)
7. Tap a lullaby → TTS renders it in the cloned voice (~8s)
8. Playback begins; progress bar visible
9. Auto-triggered if Kynari detects Sleepy/Calm and "Auto-play lullaby" is enabled
```

### Architecture

```
Mobile Client
  │
  ├── Record 3 samples (MediaRecorder API / expo-av)
  ├── Compress to .webm / .m4a (≤ 2 MB each)
  └── POST /api/voice/enroll  ──►  FastAPI
                                      │
                               ElevenLabs Voices API
                               POST /v1/voices/add
                               (voice_id returned)
                                      │
                               Store { parent_id, voice_id, label }
                               Delete raw audio immediately
                                      │
  GET /api/voice/lullabies  ──────────┘
  POST /api/voice/generate
    { child_id, lullaby_id, voice_id }
                    │
             ElevenLabs TTS
             POST /v1/text-to-speech/{voice_id}
             model: eleven_turbo_v2
             (streaming audio response)
                    │
             Stream audio back to client
             Client: do NOT cache to disk
             Play in memory → discard
```

### Lullaby Library (seed data)

| ID | Title | Duration | Mood Tag |
|----|-------|----------|----------|
| `l001` | Twinkle Twinkle Little Star (slow) | 2:14 | Sleepy |
| `l002` | Brahms' Lullaby | 3:05 | Calm |
| `l003` | Hush Little Baby | 1:58 | Fussy |
| `l004` | Rock-a-bye Baby | 2:30 | Sleepy |
| `l005` | You Are My Sunshine | 2:45 | Calm |
| `l006` | Twinkle Twinkle (upbeat) | 1:30 | Awake |
| `l007` | Custom humming loop (parent-recorded) | 0:45 | Any |
| `l008` | Somewhere Over the Rainbow | 3:20 | Calm |

All lyrics are in the public domain. Custom humming loop (l007) is generated from the parent's humming sample directly.

### New Pydantic Models

```python
# models/voice.py

class VoiceEnrollRequest(BaseModel):
    parent_id: str
    label: str = "My voice"  # "Mama", "Papa", etc.

class VoiceEnrollResponse(BaseModel):
    voice_id: str
    label: str
    enrolled_at: datetime

class LullabyGenerateRequest(BaseModel):
    child_id: str
    lullaby_id: str
    voice_id: str

class LullabyGenerateResponse(BaseModel):
    stream_url: str        # signed ephemeral URL, expires in 60s
    duration_seconds: float
    lullaby_title: str
```

### Services

```
packages/api/services/
  └── voice_studio.py
        ├── enroll_voice(parent_id, audio_files) → voice_id
        ├── list_lullabies(mood_tag=None) → List[Lullaby]
        ├── generate_lullaby(voice_id, lullaby_id) → audio_stream
        └── delete_voice(parent_id, voice_id)   # GDPR purge
```

### Privacy Rules

- Raw `.webm` / `.m4a` enrollment files are deleted from the server within 60 seconds of embedding creation — never persisted to Neon.
- The ElevenLabs `voice_id` (a pointer, not the audio) is stored encrypted in the `parent_voice_profiles` table.
- Generated lullaby audio is streamed directly to the client — never written to object storage.
- Signed URLs expire after 60 seconds.
- Parents can delete their voice profile at any time via `DELETE /api/voice/{voice_id}` — this calls `ElevenLabs DELETE /v1/voices/{voice_id}` and removes the DB record.

---

## 3. Feature 2 — AI Picture Book

### Concept

Generate a personalized 5-page illustrated storybook with the baby as the hero. The parent provides a one-sentence prompt ("Aanya meets a friendly cloud"), chooses an art style, and Kynari produces a complete mini picture book — text by Claude, illustrations by a diffusion model — in under 30 seconds.

### User Flow

```
1. Parent opens Picture Book tab
2. Types a one-sentence story prompt
3. Selects art style (Watercolour / Storybook / Line art / Bold & bright / Soft pastels)
4. Taps "Generate"
5. Claude generates 5-page narrative (structured JSON)
6. For each page: prompt sent to SDXL → illustration returned
7. Pages rendered as a swipeable book UI
8. Parent can:
   - Export as PDF
   - Trigger animated read-aloud (TTS in parent's voice)
   - Order a printed hardcover (Lulu / Printful integration)
```

### AI Pipeline

```
Parent prompt + baby's name + age
        │
        ▼
Claude (claude-sonnet-4-20250514)
System: "You are a children's book author. Generate a 5-page picture book...
         Return ONLY valid JSON matching the BookSchema below."
        │
        ▼
BookSchema {
  title: string,
  pages: [{
    page_number: int,
    illustration_prompt: string,  // SDXL-optimised, style-specific
    text: string,                 // 1-3 sentences, read-aloud friendly
    mood: "wonder" | "cozy" | "playful" | "calm" | "triumphant"
  }]
}
        │
        ├──► 5 parallel SDXL requests (Replicate API)
        │    model: stability-ai/sdxl
        │    prompt: illustration_prompt + style_suffix
        │    negative_prompt: "text, words, letters, watermark, adult, scary"
        │    width: 768, height: 512
        │
        ▼
Assembled book → stored in `picture_books` table
```

### Art Style SDXL Suffixes

| Style | Suffix added to every illustration prompt |
|-------|------------------------------------------|
| Watercolour | `watercolor illustration, soft edges, paper texture, children's book art` |
| Storybook | `classic storybook illustration, warm lighting, detailed, Beatrix Potter style` |
| Line art | `clean line art, black outlines, flat color fill, children's coloring book` |
| Bold & bright | `bold flat design, primary colors, Scandinavian children's book, thick outlines` |
| Soft pastels | `soft pastel illustration, dreamy, muted tones, Claude Ponti style` |

### New Pydantic Models

```python
# models/picture_book.py

class BookGenerateRequest(BaseModel):
    child_id: str
    prompt: str                          # max 200 chars
    art_style: Literal["watercolor", "storybook", "lineart", "bold", "soft"]
    baby_name: str
    baby_age_months: int

class BookPage(BaseModel):
    page_number: int
    text: str
    illustration_url: str                # Replicate CDN URL or internal proxy
    mood: str

class BookGenerateResponse(BaseModel):
    book_id: str
    title: str
    pages: List[BookPage]
    generated_at: datetime
    read_aloud_available: bool           # True if parent has a voice enrolled
```

### Services

```
packages/api/services/
  └── picture_book.py
        ├── generate_book(request) → BookGenerateResponse
        │     ├── _generate_narrative(prompt, baby_name, style) → BookSchema
        │     └── _generate_illustrations(pages, style) → List[str]  # URLs
        ├── get_book(book_id) → BookGenerateResponse
        ├── list_books(child_id) → List[BookSummary]
        ├── export_pdf(book_id) → bytes
        └── delete_book(book_id)
```

### Read-Aloud Integration

When the parent has a voice enrolled, the "Animated read-aloud" button calls:

```
POST /api/voice/generate
  { voice_id, text: page.text, lullaby_id: null }

→ Returns streamed TTS audio, one page at a time
→ Client advances page automatically on audio completion
```

---

## 4. Feature 3 — Care Playbook

### Concept

When a need is detected (e.g. Hungry, confidence 0.67), the Care Playbook surfaces a ranked list of soothing techniques personalised to the specific child, ordered by historical success rate. Each technique includes step-by-step guidance, an optional timer, and a feedback button ("This worked / Didn't help"). Over time, the rankings update per child, per time of day.

### Architecture

```
Detected Need + child_id + current_time
        │
        ▼
GET /api/soothe/plan?child_id=&need=hungry
        │
        ▼
PlaybookEngine.get_plan(child_id, need, hour_of_day)
        │
        ├── Fetch base techniques for need from `soothe_techniques` table
        ├── Fetch child's feedback history from `soothe_feedback` table
        ├── Score each technique:
        │     score = base_weight
        │           + (success_count / total_count) * personalisation_weight
        │           + time_of_day_bonus  (e.g. swaddle ranks higher at night)
        ├── Return top 4 ranked techniques
        └── Return first technique's step-by-step instructions
```

### Care Technique Taxonomy (seed data)

Each need maps to 4–6 techniques. This is the initial seed; feedback personalises the order per child.

**Hungry**
- Feeding position (cradle / football / side-lying)
- Calm the cry before latch
- Skin-to-skin contact
- Feed timer (per-side tracking)

**Sleepy**
- Darken the room
- White noise (links to Soundscape feature)
- Swaddle technique
- Rock & pat at 60 bpm

**Diaper**
- Change station checklist
- Distraction during change
- Barrier cream application
- Air time (3–5 min)

**Pain**
- Source check (gums / temperature / gas / hair tourniquet)
- Bicycle legs for gas
- Chest-to-chest skin contact
- When-to-call guidance (fever threshold, escalation)

**Calm**
- Tummy time
- Talk & sing (language window)
- High-contrast visual stimulation
- Smile mirroring / face-to-face

### Feedback Loop

```
Parent taps "This worked" or "Didn't help"
        │
POST /api/soothe/feedback
  { child_id, need, technique_id, outcome: "success" | "fail", notes? }
        │
        ▼
INSERT into soothe_feedback
        │
        ▼
PlaybookEngine re-scores on next plan request
(no batch retraining — simple Bayesian update on success_count / total_count)
```

### New Pydantic Models

```python
# models/soothe.py

class PlaybookTechnique(BaseModel):
    technique_id: str
    name: str
    description: str
    icon: str
    steps: List[str]
    timer_seconds: Optional[int]         # None if no timer needed
    success_rate: Optional[float]        # None until ≥3 feedback events

class PlaybookPlanResponse(BaseModel):
    need: str
    confidence: float
    techniques: List[SootheTechnique]    # ranked, max 4
    personalised: bool                   # False until ≥5 feedback events for child

class PlaybookFeedbackRequest(BaseModel):
    child_id: str
    need: str
    technique_id: str
    outcome: Literal["success", "fail"]
    notes: Optional[str]
    duration_seconds: Optional[int]      # how long they tried before feedback
```

### Services

```
packages/api/services/
  └── soothe_engine.py
        ├── get_plan(child_id, need, hour) → SoothePlanResponse
        ├── record_feedback(request) → None
        ├── get_technique_stats(child_id) → Dict[str, TechniqueStats]
        └── _score_techniques(techniques, history, hour) → List[scored]
```

---

## 5. Feature 4 — Sleep Soundscape

### Concept

A layered, adaptive audio mixer — pink noise, nature sounds, and soft melody — that adjusts automatically based on the baby's real-time distress score from Phase 1. When distress rises, the system shifts toward masking layers (pink noise, shush). When the baby settles, it fades back to gentle melody.

### Layer Architecture

```
Layer Stack (client-side Web Audio API / expo-av)
──────────────────────────────────────────────────
  [Pink noise]    ← always present, volume driven by distress
  [Nature sound]  ← parent-selected (ocean / rain / forest / none)
  [Soft piano]    ← fades out when distress > 0.5
  [Shush rhythm]  ← fades IN when distress > 0.5, 60 bpm
  [Lullaby]       ← optional, parent voice from Feature 1
```

### Auto-Adapt Logic (client-side)

```javascript
// Runs every 5 seconds when Soundscape is active
function adaptLayers(distressScore) {
  const d = distressScore;  // 0.0 – 1.0 from Phase 1 face analyzer

  layers.pinkNoise.volume  = lerp(0.5, 0.9, d);
  layers.nature.volume     = lerp(0.4, 0.2, d);
  layers.piano.volume      = lerp(0.3, 0.0, d);     // silence above 0.5
  layers.shush.volume      = d > 0.5 ? lerp(0, 0.6, (d-0.5)*2) : 0;
  layers.lullaby.volume    = lerp(0.4, 0.0, d);
}

function lerp(a, b, t) { return a + (b - a) * Math.clamp(t, 0, 1); }
```

### Preset Profiles (seed data)

| Profile | Pink Noise | Nature | Piano | Shush | Notes |
|---------|-----------|--------|-------|-------|-------|
| Deep sleep | 70% | Ocean 40% | 20% | Off | For REM sleep phases |
| Light fuss | 50% | Rain 30% | 30% | Auto | Gentle intervention |
| Heavy fuss | 85% | Off | Off | Auto | Maximum masking |
| Nap time | 60% | Forest 50% | 15% | Off | Daytime nap |
| White room | 100% | Off | Off | Off | Pure white noise |

### Server-Side (minimal)

The Soundscape runs almost entirely on-device. The server stores preferences and session logs only.

```
POST /api/soundscape/preferences
  { child_id, default_profile, auto_adapt_enabled, nature_sound }

GET  /api/soundscape/preferences/{child_id}

POST /api/soundscape/session-end
  { child_id, duration_minutes, avg_distress, profile_used }
  → stored in soundscape_sessions table for pattern analysis
```

### Audio Asset Management

Sound layer files are bundled with the app (no streaming dependency). Target sizes:

| Asset | Format | Target size |
|-------|--------|------------|
| Pink noise (loopable) | .ogg | ≤ 500 KB |
| Ocean waves (loopable) | .ogg | ≤ 800 KB |
| Rain (loopable) | .ogg | ≤ 600 KB |
| Forest (loopable) | .ogg | ≤ 700 KB |
| Soft piano (loopable) | .ogg | ≤ 1.2 MB |
| Shush rhythm (loopable) | .ogg | ≤ 200 KB |
| **Total bundle addition** | | **≤ 4 MB** |

---

## 6. Feature 5 — Memory Garden

### Concept

A passive, always-on milestone journal. Kynari automatically flags significant events — first sustained smile detected by the face analyzer, longest sleep streak, cry pattern shift — and Claude writes a short caption for each. Weekly, Claude composes a narrative journal entry from the week's emotion data.

### Event Types (auto-detected)

| Event | Detection Logic | Example Caption |
|-------|----------------|----------------|
| First laugh | Calm + high face brightness, duration > 10s | "Aanya discovered her own giggle — paused to listen to it herself." |
| Longest sleep | `max(sleep_duration)` in `soundscape_sessions` | "4.5 hours uninterrupted. Mama's happiest morning yet." |
| Pattern shift | Need distribution changes > 30% week-over-week | "Hunger cries softened into something more conversational." |
| New skill | Repeated Calm detections during tummy time | "Three consecutive tummy times today — head up for 8 seconds." |
| Growth cluster | 3+ consecutive pain detections → all resolved | "A hard afternoon, then quiet. You got through it." |
| Cry reduction | Average daily cry events drops > 20% | "Fewer signals this week. You're both learning the language." |

### Caption Generation

```python
# services/memory_garden.py

async def generate_caption(event: MilestoneEvent, child: Child) -> str:
    prompt = f"""
You are writing a warm, brief (1-2 sentence) caption for a baby milestone journal.
Baby name: {child.name}, age: {child.age_weeks} weeks.
Event type: {event.event_type}
Raw data: {event.metadata}

Write one or two sentences in a warm, slightly literary voice.
Avoid medical language. No hashtags. First person is fine ("You...").
Return only the caption text, nothing else.
"""
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=120,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()
```

### Weekly Narrative

Every Sunday at 00:00 local time, a background job runs:

```python
async def generate_weekly_narrative(child_id: str, week_data: WeekSummary) -> str:
    prompt = f"""
You are writing a weekly entry in a parent's baby journal.
Baby: {week_data.baby_name}, {week_data.age_weeks} weeks old.
Week of: {week_data.week_start}

Emotion data this week:
- Most common need: {week_data.top_need} ({week_data.top_need_pct:.0f}% of signals)
- Avg confidence: {week_data.avg_confidence:.0f}%
- Total cry events: {week_data.total_cry_events}
- Longest calm stretch: {week_data.longest_calm_hours:.1f} hours
- Milestones: {', '.join(week_data.milestones) or 'none flagged'}
- Parent feedback accuracy: {week_data.feedback_accuracy:.0f}%

Write a 3-4 sentence journal narrative in a warm, observational voice.
Use one specific detail from the data. Make it feel personal, not like a report.
Return only the narrative, nothing else.
"""
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()
```

### Export & Sharing

- **PDF journal** — styled PDF with all milestones and weekly narratives (uses existing PDF service).
- **Share reel** — client-side video assembly: milestone cards as frames, lullaby audio as background. 30-second vertical video for Instagram/WhatsApp. No server involvement.
- **Print** — POST to Lulu/Printful print-on-demand API to produce a physical hardcover.

---

## 7. Database Schema Extensions

All new tables are in the existing Neon PostgreSQL 16 instance. Add via migration files in `packages/api/migrations/`.

```sql
-- Migration: 005_phase2_voice.sql
CREATE TABLE parent_voice_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       TEXT NOT NULL,                    -- Clerk user ID
    voice_provider  TEXT NOT NULL DEFAULT 'elevenlabs',
    external_voice_id TEXT NOT NULL,                  -- ElevenLabs voice_id
    label           TEXT NOT NULL DEFAULT 'My voice',
    created_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                       -- soft delete for audit
);

CREATE INDEX ON parent_voice_profiles(parent_id);

-- Migration: 006_phase2_books.sql
CREATE TABLE picture_books (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    parent_id       TEXT NOT NULL,
    title           TEXT NOT NULL,
    art_style       TEXT NOT NULL,
    prompt          TEXT NOT NULL,
    pages_json      JSONB NOT NULL,                   -- BookPage[] serialised
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON picture_books(child_id);
CREATE INDEX ON picture_books(parent_id);

-- Migration: 007_phase2_soothe.sql
CREATE TABLE soothe_techniques (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    need            TEXT NOT NULL,                    -- hungry | sleepy | diaper | pain | calm
    name            TEXT NOT NULL,
    description     TEXT,
    icon            TEXT,
    steps_json      JSONB NOT NULL,                   -- string[]
    timer_seconds   INT,
    base_weight     FLOAT NOT NULL DEFAULT 1.0,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE soothe_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    technique_id    UUID NOT NULL REFERENCES soothe_techniques(id),
    need            TEXT NOT NULL,
    outcome         TEXT NOT NULL CHECK (outcome IN ('success', 'fail')),
    duration_seconds INT,
    notes           TEXT,
    hour_of_day     INT NOT NULL,                     -- 0-23, for time-of-day scoring
    recorded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON soothe_feedback(child_id, need);
CREATE INDEX ON soothe_feedback(child_id, technique_id);

-- Migration: 008_phase2_soundscape.sql
CREATE TABLE soundscape_preferences (
    child_id        UUID PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    default_profile TEXT NOT NULL DEFAULT 'deep_sleep',
    auto_adapt      BOOLEAN NOT NULL DEFAULT true,
    nature_sound    TEXT NOT NULL DEFAULT 'ocean',
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE soundscape_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    duration_minutes INT,
    avg_distress    FLOAT,
    profile_used    TEXT,
    auto_adapt_used BOOLEAN
);

CREATE INDEX ON soundscape_sessions(child_id);

-- Migration: 009_phase2_memory.sql
CREATE TABLE milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    event_data_json JSONB,
    caption         TEXT,                             -- Claude-generated
    icon            TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON milestones(child_id, occurred_at DESC);

CREATE TABLE weekly_narratives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    narrative       TEXT NOT NULL,
    week_data_json  JSONB,                            -- WeekSummary snapshot
    generated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(child_id, week_start)
);

CREATE INDEX ON weekly_narratives(child_id, week_start DESC);
```

---

## 8. API Surface — New Endpoints

All endpoints require `Authorization: Bearer <clerk_token>` and are registered in `packages/api/main.py`.

### Voice Lullaby (`/api/voice`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/voice/enroll` | Upload 3 audio files → create voice clone → return `voice_id` |
| `GET` | `/api/voice/profiles` | List parent's enrolled voice profiles |
| `DELETE` | `/api/voice/{voice_id}` | Delete voice profile + ElevenLabs record |
| `GET` | `/api/voice/lullabies` | List lullaby library (filterable by `mood_tag`) |
| `POST` | `/api/voice/generate` | Generate lullaby in cloned voice → stream audio |

### Picture Book (`/api/books`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/books/generate` | Generate 5-page book → return `book_id` + pages |
| `GET` | `/api/books/{book_id}` | Fetch a stored book |
| `GET` | `/api/books?child_id=` | List books for a child |
| `GET` | `/api/books/{book_id}/pdf` | Export book as PDF (binary response) |
| `DELETE` | `/api/books/{book_id}` | Delete book + illustration assets |

### Soothe Engine (`/api/soothe`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/soothe/plan` | `?child_id=&need=hungry` → ranked technique plan |
| `GET` | `/api/soothe/techniques` | Full technique catalogue (admin / seeding) |
| `POST` | `/api/soothe/feedback` | Record outcome for a technique |
| `GET` | `/api/soothe/stats/{child_id}` | Per-child technique success rates |

### Soundscape (`/api/soundscape`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/soundscape/preferences/{child_id}` | Get saved preferences |
| `POST` | `/api/soundscape/preferences` | Save preferences |
| `POST` | `/api/soundscape/session-end` | Log completed soundscape session |
| `GET` | `/api/soundscape/sessions/{child_id}` | Sleep session history |

### Memory Garden (`/api/memory`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/memory/milestones/{child_id}` | Paginated milestone list |
| `POST` | `/api/memory/milestones` | Manually log a milestone |
| `DELETE` | `/api/memory/milestones/{milestone_id}` | Delete a milestone |
| `GET` | `/api/memory/narrative/{child_id}/week` | `?week=2026-04-07` → weekly narrative |
| `GET` | `/api/memory/narrative/{child_id}/latest` | Most recent narrative |
| `POST` | `/api/memory/export/pdf/{child_id}` | Full journal PDF export |

---

## 9. Monorepo Structure Changes

```
kynari/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── playbook/                 # NEW — Phase 2 main section
│       │   │   ├── page.tsx              #   Soothe & Comfort dashboard
│       │   │   ├── voice/
│       │   │   │   └── page.tsx          #   Voice Lullaby Studio
│       │   │   ├── stories/
│       │   │   │   ├── page.tsx          #   Book library
│       │   │   │   └── [book_id]/
│       │   │   │       └── page.tsx      #   Book reader
│       │   │   ├── soundscape/
│       │   │   │   └── page.tsx          #   Sleep Soundscape mixer
│       │   │   └── garden/
│       │   │       └── page.tsx          #   Memory Garden
│       │   └── (existing Phase 1 routes)
│       └── components/
│           ├── playbook/                 # NEW
│           │   ├── PlaybookPanel.tsx     #   Triggered from Phase 1 result
│           │   ├── PlaybookPlan.tsx      #   Ranked technique list
│           │   ├── TechniqueCard.tsx
│           │   ├── StepGuide.tsx
│           │   └── FeedbackButtons.tsx
│           ├── voice/                    # NEW
│           │   ├── VoiceRecorder.tsx     #   MediaRecorder wrapper
│           │   ├── Waveform.tsx          #   Animated waveform display
│           │   ├── LullabyLibrary.tsx
│           │   └── NowPlaying.tsx
│           ├── book/                     # NEW
│           │   ├── BookGenerator.tsx     #   Prompt + style picker
│           │   ├── PageSpread.tsx        #   Two-page layout
│           │   ├── BookReader.tsx        #   Swipeable reader
│           │   └── StyleChips.tsx
│           ├── soundscape/               # NEW
│           │   ├── LayerMixer.tsx        #   Volume sliders per layer
│           │   ├── ProfileSelector.tsx
│           │   └── AutoAdaptBadge.tsx
│           └── garden/                   # NEW
│               ├── MilestoneCard.tsx
│               ├── MilestoneGrid.tsx
│               └── WeeklyNarrative.tsx
│
└── packages/
    └── api/
        ├── routers/
        │   ├── voice.py                  # NEW
        │   ├── books.py                  # NEW
        │   ├── playbook.py               # NEW
        │   ├── soundscape.py             # NEW
        │   └── memory.py                 # NEW
        ├── services/
        │   ├── voice_studio.py           # NEW
        │   ├── picture_book.py           # NEW
        │   ├── playbook_engine.py        # NEW
        │   ├── soundscape_service.py     # NEW
        │   └── memory_garden.py          # NEW
        ├── models/
        │   ├── voice.py                  # NEW
        │   ├── book.py                   # NEW
        │   ├── playbook.py               # NEW
        │   ├── soundscape.py             # NEW
        │   └── memory.py                 # NEW
        └── migrations/
            ├── 005_phase2_voice.sql      # NEW
            ├── 006_phase2_books.sql      # NEW
            ├── 007_phase2_playbook.sql   # NEW
            ├── 008_phase2_soundscape.sql # NEW
            └── 009_phase2_memory.sql     # NEW
```

---

## 10. Tech Stack Additions

| Layer | Addition | Purpose | Replaces / Extends |
|-------|---------|---------|-------------------|
| Voice cloning | ElevenLabs API (`eleven_turbo_v2`) | TTS in parent's voice | New |
| Image generation | Replicate API (SDXL) | Picture book illustrations | New |
| Audio (web) | Web Audio API (native) | Soundscape layer mixing | New |
| Audio (mobile) | `expo-av` | Recording + playback on React Native | New |
| Background jobs | APScheduler (FastAPI) | Weekly narrative cron, milestone detection | New |
| Print-on-demand | Lulu Direct API or Printful | Physical book orders | New |
| PDF generation | `weasyprint` or `reportlab` | Journal + book PDF export | Extends existing PDF service |
| Python deps | `elevenlabs`, `replicate`, `apscheduler`, `weasyprint` | Phase 2 services | New |
| npm packages | `wavesurfer.js` | Waveform visualisation in Voice Studio | New |

### Environment Variables — New

```dotenv
# Voice Lullaby Studio
ELEVENLABS_API_KEY=sk_...

# Picture Book
REPLICATE_API_TOKEN=r8_...

# Print on demand (optional)
LULU_CLIENT_KEY=...
LULU_CLIENT_SECRET=...

# Background jobs
WEEKLY_NARRATIVE_CRON=0 0 * * 0     # Sundays at midnight (local)
MILESTONE_CHECK_INTERVAL_MINUTES=60
```

---

## 11. Implementation Phases & Timeline

### Phase 2a — Core Soothe (Weeks 1–3)

**Goal:** Ship the highest-value, lowest-dependency feature first.

- [ ] DB migrations 007 (soothe tables) + seed techniques
- [ ] `soothe_engine.py` service + Bayesian scoring
- [ ] `POST /api/soothe/plan` + `POST /api/soothe/feedback`
- [ ] `SoothePanel.tsx` — surfaces automatically from Phase 1 result card
- [ ] `TechniqueCard.tsx`, `StepGuide.tsx`, `FeedbackButtons.tsx`
- [ ] `SoothePlan.tsx` — ranked list with timer
- [ ] Unit tests: scoring logic, feedback recording, plan endpoint

**Deliverable:** When Kynari detects "Hungry", a ranked 4-step soothing plan appears with a timer. Parent can mark what worked.

---

### Phase 2b — Sleep Soundscape (Weeks 2–4)

**Goal:** Pure client-side feature with minimal backend. Can be built in parallel with 2a.

- [ ] Bundle 6 audio assets (`.ogg`, ≤ 4 MB total)
- [ ] `LayerMixer.tsx` — Web Audio API layer control
- [ ] Auto-adapt logic (reads `distressScore` from Phase 1 face analyzer)
- [ ] DB migrations 008 + preferences endpoint
- [ ] `POST /api/soundscape/session-end` for sleep analytics
- [ ] Profile presets UI
- [ ] Integration test: auto-adapt responds to mock distress score changes

**Deliverable:** Parents can mix their own soundscape; auto-adapt mode silently adjusts when distress changes.

---

### Phase 2c — Voice Lullaby Studio (Weeks 3–6)

**Goal:** The flagship feature. Requires ElevenLabs integration and careful privacy handling.

- [ ] DB migration 005 (voice profiles)
- [ ] `VoiceRecorder.tsx` — browser MediaRecorder, 3-sample flow
- [ ] `Waveform.tsx` — real-time waveform using `wavesurfer.js`
- [ ] `POST /api/voice/enroll` — upload → ElevenLabs → store `voice_id` → delete audio
- [ ] `POST /api/voice/generate` — stream lullaby in cloned voice
- [ ] `LullabyLibrary.tsx` + `NowPlaying.tsx`
- [ ] Auto-trigger: if `need = Sleepy` and auto-play enabled, start lullaby
- [ ] `DELETE /api/voice/{voice_id}` — full purge (ElevenLabs + DB)
- [ ] E2E test: enroll → generate → play → delete
- [ ] Privacy audit: confirm no raw audio in logs, DB, or object storage

**Deliverable:** Parents can enroll their voice and have lullabies rendered in it. Auto-plays when baby is detected as sleepy.

---

### Phase 2d — AI Picture Book (Weeks 5–8)

**Goal:** End-to-end generative feature. Requires Claude + Replicate + PDF export.

- [ ] DB migration 006 (picture_books)
- [ ] `picture_book.py` service — Claude narrative + Replicate SDXL in parallel
- [ ] `BookGenerator.tsx` — prompt input + style selector
- [ ] `BookReader.tsx` — swipeable page spread with illustrations
- [ ] `GET /api/books/{id}/pdf` — WeasyPrint PDF generation
- [ ] Read-aloud integration (calls Feature 1 TTS per page)
- [ ] Lulu/Printful integration (optional, post-MVP)
- [ ] Rate limiting: 5 book generations per parent per day
- [ ] Cost guardrails: log Replicate spend per `parent_id`

**Deliverable:** Parent types a prompt, gets a personalized 5-page illustrated book in 30 seconds. Can export PDF or order a print.

---

### Phase 2e — Memory Garden (Weeks 7–9)

**Goal:** Passive milestone detection + weekly narrative. Builds on existing summary infrastructure.

- [ ] DB migrations 009 (milestones, weekly_narratives)
- [ ] Milestone detection job (APScheduler, runs hourly)
- [ ] `generate_caption()` — Claude caption for each milestone
- [ ] `generate_weekly_narrative()` — Claude weekly journal entry
- [ ] Weekly cron (Sunday midnight, per child)
- [ ] `MilestoneGrid.tsx` + `MilestoneCard.tsx`
- [ ] `WeeklyNarrative.tsx`
- [ ] Journal PDF export
- [ ] Share reel (client-side video, Phase 2e+)

**Deliverable:** Parents see a living milestone journal that fills itself. Every Sunday, a narrative journal entry appears.

---

### Phase 2f — Polish & Integration (Weeks 9–10)

- [ ] Unified "Soothe & Comfort" tab in nav (surfaces all 5 features contextually)
- [ ] Phase 1 → Phase 2 trigger: result card shows relevant Phase 2 action
- [ ] Onboarding flow for Phase 2 features (progressive disclosure)
- [ ] Analytics: track feature adoption, session lengths, feedback rates
- [ ] Accessibility audit (WCAG 2.1 AA for all new UI)
- [ ] Load testing: 100 concurrent book generations, 500 concurrent soundscape sessions

---

## 12. Privacy & Ethics Additions

| Principle | Phase 2 Implementation |
|-----------|------------------------|
| Voice data minimisation | Raw enrollment audio deleted within 60s; only `voice_id` pointer stored |
| Voice data control | `DELETE /api/voice/{id}` triggers ElevenLabs deletion + DB purge — UI exposes this clearly |
| Generated content labelling | All AI-generated book text and captions are labelled "AI-generated" in the UI |
| Illustration content filtering | Replicate SDXL calls include negative prompts blocking adult content; outputs are moderated |
| Milestone opt-out | Parents can disable passive milestone detection per child |
| Weekly narrative opt-out | Parents can disable Claude narrative generation; raw data remains |
| Cost transparency | Book generation cost is logged; parents are notified if a quota is approaching |
| Child voice protection | No TTS or voice generation using the *baby's* vocalizations — only parent voice |
| COPPA milestone data | All milestone data is covered by the existing `DELETE /children/{id}` cascade |

---

## 13. Performance Targets

| Feature | Metric | Target |
|---------|--------|--------|
| Soothe plan | API response time | < 200ms |
| Voice enrollment | End-to-end (3 samples → voice_id) | < 15s |
| Lullaby generation | First audio byte | < 5s |
| Picture book | Full 5-page generation | < 30s |
| Illustration per page | Single SDXL image | < 6s |
| Soundscape | Layer crossfade latency | < 100ms |
| Memory Garden | Caption generation | < 3s |
| Weekly narrative | Background job (cron) | < 10s |
| PDF export | Book (5 pages + images) | < 8s |

---

## 14. Open Questions & Risks

### Voice Cloning

- **Risk:** ElevenLabs pricing at scale. ~$0.30 per 1,000 characters TTS. A 3-minute lullaby ≈ 500 characters ≈ $0.15 per play. Consider per-parent caching: generate once, store encrypted `.ogg` with TTL, delete after 7 days.
- **Question:** Do we want a fallback TTS voice (generic, free) when no parent voice is enrolled?
- **Risk:** Regulatory landscape around voice cloning varies by jurisdiction. Legal review needed before launch in EU.

### Picture Book Illustrations

- **Risk:** Replicate SDXL costs ≈ $0.0023 per image. 5 pages = $0.0115 per book. At 10,000 books/month = $115. Acceptable, but needs a rate limit.
- **Risk:** SDXL occasionally generates inappropriate content despite negative prompts. Implement a post-generation moderation step (Amazon Rekognition or similar) before returning images to the client.
- **Question:** Who owns the generated illustrations? IP review needed.

### Soothe Engine Accuracy

- **Risk:** The Bayesian scoring is simple and could converge on a single technique per child after enough feedback, reducing variety. Consider an exploration bonus (epsilon-greedy or Thompson sampling) to keep showing alternative techniques.

### Memory Garden — Milestone False Positives

- **Risk:** The face analyzer may misclassify a grimace as a smile, generating an incorrect "first laugh" milestone. Consider requiring 3+ consecutive detections before flagging a milestone.

### ElevenLabs Dependency

- **Risk:** Single vendor for voice. Fallback plan: integrate `coqui-tts` (open source, self-hosted) as a degraded fallback if ElevenLabs is unavailable.

---

*Document version 1.0 — Kynari Phase 2 · April 2026*
*Owners: Engineering Lead, Product, AI/ML*
*Review cycle: weekly during implementation phases*