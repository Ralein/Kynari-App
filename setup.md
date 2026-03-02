# 🧒 KYNARI — Master Vibe-Coding Prompt
> Paste each phase prompt into Cursor / Windsurf / Claude Projects in order.  
> Complete one phase fully before moving to the next.  
> Each prompt is self-contained and references the stack decisions made in the project plan.

---

## 🧠 GLOBAL CONTEXT BLOCK
> Paste this at the top of EVERY phase prompt, or set it as your Cursor Rules / Claude Project system prompt.

```
You are building KYNARI — a privacy-first AI emotion detection app for toddlers (ages 1–5).

CORE RULES (never break these):
- Raw audio and video NEVER leave the device. Only emotion label + confidence + timestamp are sent to the backend.
- All ML inference runs on-device using ONNX Runtime.
- Zero audio storage. Buffers are discarded immediately after inference.
- Every API route must be typed end-to-end (Pydantic on backend, TypeScript on frontend).
- Write production-quality code. No TODOs, no placeholder logic, no mock data unless explicitly asked.
- After every file you create, tell me what it does in one sentence.

TECH STACK:
- Frontend Web: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Mobile: Expo (React Native), TypeScript, Expo Router
- Backend: Python + FastAPI + uv (NOT pip, NOT poetry — use uv)
- Database & Auth: Supabase (Postgres + Supabase Auth)
- On-Device ML: ONNX Runtime (onnxruntime-react-native)
- Charts: Recharts (web), Victory Native (mobile)
- Monorepo: Turborepo + pnpm workspaces
- Deployment: Vercel (web), Railway (API), EAS Build (mobile)

FOLDER STRUCTURE:
kynari/
├── apps/
│   ├── web/          → Next.js 15
│   └── mobile/       → Expo
├── packages/
│   ├── api/          → FastAPI
│   ├── shared/       → Shared TypeScript types
│   └── ml-training/  → Python ONNX model training + export
├── docker-compose.yml
└── turbo.json

EMOTION CLASSES: happy, sad, angry, fearful, neutral, frustrated

EMOTION EVENT SCHEMA (the only data sent to backend):
{
  child_id: string (UUID),
  timestamp: string (ISO 8601),
  emotion_label: "happy" | "sad" | "angry" | "fearful" | "neutral" | "frustrated",
  confidence: number (0–1),
  modality: "voice" | "face" | "combined",
  session_id: string (UUID)
}
```

---

## ⚙️ PHASE 0 — Foundation & Setup
**Goal:** Monorepo running, CI/CD live, Supabase wired up, auth working end-to-end.  
**Paste this prompt after the Global Context Block.**

```
PHASE 0: Foundation & Setup

Create the full Kynari monorepo from scratch. Do every step below in order.

─── STEP 1: MONOREPO SCAFFOLD ───────────────────────────────────────────────

Initialize a Turborepo monorepo using pnpm workspaces with this exact structure:

kynari/
├── apps/
│   ├── web/            (Next.js 15, App Router, TypeScript, Tailwind, shadcn/ui)
│   └── mobile/         (Expo SDK 51+, Expo Router v3, TypeScript)
├── packages/
│   ├── api/            (FastAPI, Python 3.12, managed with uv)
│   ├── shared/         (TypeScript types only — no runtime deps)
│   └── ml-training/    (Python 3.12, uv, for ONNX model work)
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── .github/workflows/

Rules:
- pnpm workspaces, not npm or yarn
- turbo.json should define pipelines: build, dev, lint, test
- Each app/package has its own tsconfig.json extending a root tsconfig.base.json
- Add .env.example at root with all required env var keys (no values)

─── STEP 2: SHARED TYPES PACKAGE ────────────────────────────────────────────

In packages/shared/src/index.ts, export these TypeScript types:

export type EmotionLabel = "happy" | "sad" | "angry" | "fearful" | "neutral" | "frustrated"
export type Modality = "voice" | "face" | "combined"

export interface EmotionEvent {
  child_id: string
  timestamp: string        // ISO 8601
  emotion_label: EmotionLabel
  confidence: number       // 0–1
  modality: Modality
  session_id: string
}

export interface Child {
  id: string
  name: string
  date_of_birth: string    // ISO 8601 date
  created_at: string
  parent_id: string
}

export interface DailySummary {
  child_id: string
  date: string             // YYYY-MM-DD
  dominant_emotion: EmotionLabel
  emotion_distribution: Record<EmotionLabel, number>  // percentages 0–100
  total_events: number
  baseline_deviation: number | null   // z-score, null if baseline not formed yet
  insight_text: string    // e.g. "More frustrated than usual around 5–6pm"
}

export interface ChildBaseline {
  child_id: string
  emotion: EmotionLabel
  mean_frequency: number   // avg events per hour
  std_deviation: number
  calibration_complete: boolean
  days_of_data: number
  last_updated: string
}

─── STEP 3: SUPABASE SCHEMA ─────────────────────────────────────────────────

Write a complete Supabase SQL migration file at packages/api/migrations/001_initial.sql

Create these tables:

children
  - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  - name TEXT NOT NULL
  - date_of_birth DATE NOT NULL
  - created_at TIMESTAMPTZ DEFAULT NOW()
  - avatar_url TEXT

emotion_events
  - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE
  - session_id UUID NOT NULL
  - emotion_label TEXT NOT NULL CHECK (emotion_label IN ('happy','sad','angry','fearful','neutral','frustrated'))
  - confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1)
  - modality TEXT NOT NULL CHECK (modality IN ('voice','face','combined'))
  - timestamp TIMESTAMPTZ NOT NULL
  - created_at TIMESTAMPTZ DEFAULT NOW()

daily_summaries
  - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE
  - date DATE NOT NULL
  - dominant_emotion TEXT NOT NULL
  - emotion_distribution JSONB NOT NULL
  - total_events INTEGER NOT NULL DEFAULT 0
  - baseline_deviation FLOAT
  - insight_text TEXT
  - UNIQUE(child_id, date)

child_baselines
  - id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE
  - emotion TEXT NOT NULL
  - mean_frequency FLOAT NOT NULL DEFAULT 0
  - std_deviation FLOAT NOT NULL DEFAULT 0
  - calibration_complete BOOLEAN DEFAULT FALSE
  - days_of_data INTEGER DEFAULT 0
  - last_updated TIMESTAMPTZ DEFAULT NOW()
  - UNIQUE(child_id, emotion)

Add Row Level Security (RLS) policies:
- Parents can only SELECT/INSERT/UPDATE/DELETE their own children
- emotion_events, daily_summaries, child_baselines are accessible only if child belongs to the authenticated parent
- Enable RLS on all tables

─── STEP 4: FASTAPI SKELETON ────────────────────────────────────────────────

In packages/api/, create a full FastAPI app using uv.

File structure:
packages/api/
├── pyproject.toml         (uv-managed, Python 3.12)
├── main.py
├── config.py              (Pydantic Settings — reads from .env)
├── database.py            (Supabase client setup using supabase-py)
├── routers/
│   ├── children.py        (CRUD for child profiles)
│   ├── events.py          (POST emotion events, GET by child+date)
│   └── summaries.py       (GET daily summaries, GET weekly patterns)
├── services/
│   ├── baseline_engine.py (placeholder — implemented in Phase 1)
│   └── summary_generator.py (placeholder — implemented in Phase 2)
└── models/
    └── schemas.py         (Pydantic models matching Supabase schema)

Requirements in pyproject.toml:
- fastapi, uvicorn[standard], supabase, pydantic, pydantic-settings, python-jose, httpx

Rules:
- All routes use async def
- Auth middleware: extract JWT from Authorization header, verify with Supabase, attach user to request state
- Return 401 if no valid token
- Add CORS middleware: allow localhost:3000, localhost:8081, and the Vercel domain (from env var)
- Health check: GET /health → { status: "ok", version: "0.1.0" }

─── STEP 5: NEXT.JS WEB SKELETON ────────────────────────────────────────────

In apps/web/, scaffold a Next.js 15 app with App Router.

Pages to create (empty but routed):
- / → landing/marketing page (hero + tagline + CTA)
- /login → Supabase Auth email magic link login
- /dashboard → parent dashboard (protected route)
- /dashboard/[childId] → child's emotion report (protected route)
- /onboarding → add first child flow (protected route)

Requirements:
- Install and configure shadcn/ui (use "new-york" style, zinc base color)
- Create lib/supabase/client.ts (browser Supabase client)
- Create lib/supabase/server.ts (server Supabase client for Server Components)
- Create middleware.ts for route protection (redirect /dashboard → /login if no session)
- Tailwind config: extend with kynari brand colors:
    teal: { DEFAULT: "#0D9488", light: "#CCFBF1", mid: "#99F6E4" }
    brand-orange: "#F97316"

─── STEP 6: EXPO MOBILE SKELETON ────────────────────────────────────────────

In apps/mobile/, scaffold an Expo app with Expo Router v3.

Screens to create (empty but routed):
- (auth)/login.tsx → magic link login
- (app)/index.tsx → home/dashboard
- (app)/monitor.tsx → "place phone in room" monitoring screen
- (app)/child/[id].tsx → child emotion report
- (app)/onboarding.tsx → add first child

Requirements:
- expo-router, expo-av (microphone), expo-notifications, expo-battery
- @supabase/supabase-js with AsyncStorage adapter
- Create lib/supabase.ts (Supabase client for React Native)
- Create lib/api.ts (typed fetch client pointing to FastAPI base URL from env)
- Add app.json with correct bundleIdentifier: com.kynari.app

─── STEP 7: CI/CD ───────────────────────────────────────────────────────────

Create .github/workflows/ci.yml

Pipeline:
On push to any branch:
  1. Lint: pnpm lint (all apps)
  2. Type check: pnpm typecheck (all apps)
  3. Test: pnpm test (all apps)
  4. Build: pnpm build (web only on CI)

On push to main:
  1. All above steps
  2. Deploy web to Vercel (use VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID secrets)
  3. Deploy API to Railway (use RAILWAY_TOKEN secret)

Also create docker-compose.yml at root:
- Service: api → packages/api, port 8000, hot reload with uvicorn --reload
- Service: db → postgres:15-alpine, port 5432 (for local dev only)

─── STEP 8: ENVIRONMENT SETUP ───────────────────────────────────────────────

Create .env.example at root with these keys:

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# API
NEXT_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_API_URL=http://localhost:8000
API_CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# Auth
JWT_SECRET=

# Deployment
VERCEL_URL=
RAILWAY_DOMAIN=

Write a README.md with:
1. Prerequisites (Node 20+, pnpm, Python 3.12, uv, Docker)
2. Setup steps (clone → pnpm install → cp .env.example → supabase start → pnpm dev)
3. Architecture diagram in ASCII art
4. Links to each app's dev server

When done, list every file created with a one-line description of each.
```

---

## 🧠 PHASE 1 — Core Emotion Engine (On-Device AI)
**Goal:** ONNX SER model running on-device in Expo. Baseline engine live in FastAPI. Emotion events flowing end-to-end.  
**Paste after Global Context Block.**

```
PHASE 1: Core Emotion Engine

Build the on-device emotion recognition pipeline and the FastAPI baseline engine.
Do every step in order. This is the hardest phase — be thorough.

─── STEP 1: ML TRAINING ENVIRONMENT ────────────────────────────────────────

In packages/ml-training/, set up the Python environment using uv.

pyproject.toml dependencies:
- speechbrain>=1.0.0
- onnx>=1.16.0
- onnxruntime>=1.18.0
- torch>=2.3.0
- torchaudio>=2.3.0
- numpy, pandas, scikit-learn, librosa, soundfile

Create these scripts:

1. scripts/download_datasets.py
   - Downloads RAVDESS dataset (publicly available)
   - Organizes into data/raw/{emotion_label}/ folders
   - Prints dataset statistics (count per class, total duration)

2. scripts/train_ser.py
   - Uses SpeechBrain wav2vec2 base model as feature extractor
   - Fine-tunes a classification head on top for 6 emotion classes
   - Training config:
       batch_size=16, epochs=30, lr=1e-4
       80/10/10 train/val/test split
   - Saves best model checkpoint to models/ser_checkpoint/
   - Prints accuracy, F1 per class, confusion matrix at end

3. scripts/export_onnx.py
   - Loads trained SpeechBrain checkpoint
   - Exports to ONNX format at models/kynari_ser.onnx
   - Input: float32 tensor of shape [1, audio_length] (raw waveform, 16kHz)
   - Output: float32 tensor of shape [1, 6] (logits for 6 emotion classes)
   - Validates exported model with onnxruntime (run inference, check output shape)
   - Prints model size in MB

4. scripts/evaluate.py
   - Loads kynari_ser.onnx
   - Runs on held-out test set
   - Prints accuracy, F1, latency per inference (target: <50ms on CPU)

Important: Add a pre-trained fallback. If the user hasn't trained yet, 
download the pre-trained speechbrain/emotion-recognition-wav2vec2-IEMOCAP 
model from HuggingFace and export it to ONNX as the default.

─── STEP 2: ON-DEVICE INFERENCE ENGINE (REACT NATIVE) ──────────────────────

In apps/mobile/lib/emotion/, create the full inference pipeline.

Files to create:

1. apps/mobile/lib/emotion/inference.ts
   
   Class: EmotionInferenceEngine
   
   constructor():
   - Loads kynari_ser.onnx from app assets using ONNX Runtime React Native
   - Model must be bundled in apps/mobile/assets/models/kynari_ser.onnx
   
   async initialize(): Promise<void>
   - Creates InferenceSession from bundled ONNX model
   - Warms up with a dummy tensor (reduces first-inference latency)
   - Sets this.ready = true
   
   async predict(audioBuffer: Float32Array): Promise<EmotionPrediction>
   - Input: raw PCM float32 array at 16kHz
   - Runs ONNX session with input name "input"
   - Applies softmax to raw logits
   - Returns: { emotion: EmotionLabel, confidence: number, all_scores: Record<EmotionLabel, number> }
   - Must complete in <100ms
   - After returning, set audioBuffer = null (GC the raw audio immediately)
   
   Types:
   export interface EmotionPrediction {
     emotion: EmotionLabel
     confidence: number
     all_scores: Record<EmotionLabel, number>
     latency_ms: number
   }

2. apps/mobile/lib/emotion/audioProcessor.ts
   
   Class: AudioProcessor
   
   - Uses expo-av Audio.Recording API
   - Records in LINEAR16 format, 16kHz sample rate, mono channel
   - Captures 3-second windows, then immediately stops and reads buffer
   - Converts recording URI → Float32Array (normalized -1 to 1)
   - Applies a simple noise gate: if RMS < 0.01, return null (silence, skip inference)
   - Calls EmotionInferenceEngine.predict() with the buffer
   - Discards the recording file immediately after reading buffer (unlink the temp file)
   - Emits an EmotionPrediction via callback
   
   Public API:
   startContinuousCapture(onPrediction: (p: EmotionPrediction) => void): void
   stopContinuousCapture(): void
   
   Internals:
   - Runs capture loop: record 3s → process → wait 12s → repeat (15s total cycle, battery friendly)
   - If battery < 20%, extend cycle to 30s
   - If app goes to background, pause capture loop
   - If app returns to foreground, resume capture loop

3. apps/mobile/lib/emotion/sessionManager.ts
   
   Class: SessionManager
   
   Manages a monitoring session (parent places phone in room).
   
   startSession(childId: string): string (returns sessionId)
   stopSession(): void
   
   On each prediction from AudioProcessor:
   - If confidence < 0.55, discard (too uncertain)
   - Package into EmotionEvent (import type from packages/shared)
   - Add to in-memory event queue
   - Every 60 seconds, flush queue to FastAPI POST /events/batch
   - If network fails, retry with exponential backoff (max 3 retries)
   - After successful flush, clear queue

─── STEP 3: MONITORING SCREEN ───────────────────────────────────────────────

In apps/mobile/app/(app)/monitor.tsx, build the monitoring UX.

UI states:
1. IDLE — Large circular button "Start Monitoring", child selector at top
2. MONITORING — 
   - Shows "Listening for [Child Name]" with a pulsing teal ring animation
   - Current emotion badge (updates in real-time): emoji + label + confidence %
   - Session duration timer (HH:MM:SS)
   - Battery indicator (warn if < 20%)
   - Small text: "Audio is processed on your device and never stored or sent"
   - "Stop" button
3. LOW_BATTERY — shows warning banner, suggests plugging in

Requirements:
- Use Animated API for the pulsing ring (not Reanimated, to keep deps light)
- The emotion badge must animate smoothly when emotion changes (fade transition)
- Microphone permission request handled gracefully with explanation modal if denied
- Screen must stay awake during monitoring (expo-keep-awake)
- Works in background for 10 minutes max (iOS background audio limitation)

─── STEP 4: FASTAPI BASELINE ENGINE ─────────────────────────────────────────

In packages/api/services/baseline_engine.py, implement the full baseline system.

class BaselineEngine:

    async def ingest_events(self, child_id: str, events: list[EmotionEvent]) -> None:
        """
        Store emotion events and trigger baseline recalculation.
        - Batch insert events into emotion_events table
        - If total events for child today > 5, trigger recalculate_baseline()
        """

    async def recalculate_baseline(self, child_id: str) -> ChildBaseline:
        """
        Recalculate rolling 14-day baseline for each emotion class.
        
        Algorithm:
        1. Fetch all emotion_events for child in last 14 days
        2. Group by day and emotion_label
        3. Calculate events_per_hour for each emotion per day (normalize by hours with events)
        4. Compute mean and std_deviation across 14 days for each emotion
        5. Mark calibration_complete = True if days_of_data >= 7
        6. Upsert into child_baselines table
        7. Return updated ChildBaseline
        """

    async def get_deviation(self, child_id: str, emotion: EmotionLabel, 
                            current_frequency: float) -> float | None:
        """
        Returns z-score: (current - mean) / std_deviation
        Returns None if calibration not complete or std_deviation == 0
        """

    async def generate_daily_summary(self, child_id: str, date: str) -> DailySummary:
        """
        Generate a DailySummary for a given date.
        
        1. Fetch all emotion_events for child on that date
        2. Calculate emotion_distribution (% of events per emotion)
        3. Find dominant_emotion (highest %)
        4. For each emotion, calculate deviation using get_deviation()
        5. Generate insight_text using this template logic:
           - If any emotion has z-score > 1.5: "[Emotion] was higher than usual today"
           - If z-score < -1.5: "Unusually calm/quiet compared to their normal"
           - If no significant deviation: "A fairly typical day emotionally"
           - Add time context if events cluster: "...especially around [time range]"
        6. Upsert into daily_summaries table
        7. Return DailySummary
        """

─── STEP 5: BATCH EVENTS API ENDPOINT ──────────────────────────────────────

In packages/api/routers/events.py, implement:

POST /events/batch
  Body: { child_id: str, session_id: str, events: list[EmotionEventCreate] }
  Auth: Required (JWT)
  
  Steps:
  1. Verify child belongs to authenticated parent (fetch from children table)
  2. Validate all events (emotion_label must be in valid set, confidence 0–1)
  3. Call baseline_engine.ingest_events()
  4. Trigger generate_daily_summary() as a background task (FastAPI BackgroundTasks)
  5. Return: { received: int, session_id: str, status: "ok" }

GET /events/{child_id}
  Params: date (YYYY-MM-DD, required), session_id (optional filter)
  Auth: Required
  Returns: list of EmotionEvent for that child on that date

GET /events/{child_id}/timeline
  Params: date (YYYY-MM-DD)
  Returns: events grouped by hour: [{ hour: 14, events: [...], dominant_emotion: "happy" }]
  (Used for the hourly chart on the dashboard)

─── STEP 6: END-TO-END TEST ────────────────────────────────────────────────

Create packages/api/tests/test_baseline_engine.py

Write pytest tests for:
1. test_ingest_events_stores_correctly — mock Supabase, verify insert called
2. test_recalculate_baseline_needs_7_days — verify calibration_complete is False before 7 days
3. test_deviation_calculation — hardcode mean=5, std=2, current=9, expect z=2.0
4. test_generate_daily_summary_high_frustration — verify insight_text mentions "frustrated"
5. test_generate_daily_summary_insufficient_data — verify baseline_deviation is None

Run: uv run pytest tests/ -v

When done, output a summary of every file created and the E2E data flow in plain English (one paragraph).
```

---

## 📊 PHASE 2 — Parent Dashboard & UX
**Goal:** Parents can see their child's emotional report on web and mobile. Charts, alerts, monitoring flow all working.  
**Paste after Global Context Block.**

```
PHASE 2: Parent Dashboard & UX

Build the full parent-facing UI on both Next.js (web) and Expo (mobile).
Every screen must be polished and production-ready. No placeholder UI.

─── STEP 1: DESIGN SYSTEM ───────────────────────────────────────────────────

In apps/web/components/ui/, create these custom components on top of shadcn/ui:

1. EmotionBadge.tsx
   Props: emotion: EmotionLabel, size?: "sm" | "md" | "lg"
   Renders a pill badge with:
   - Emoji: happy=😄 sad=😢 angry=😠 fearful=😨 neutral=😐 frustrated=😤
   - Color: each emotion has a unique background (use soft pastels, not neons)
   - Label text (capitalized)

2. EmotionBar.tsx
   Props: distribution: Record<EmotionLabel, number>
   Renders a stacked horizontal bar chart showing emotion distribution for the day.
   Each segment is colored per emotion. Tooltip on hover shows %.

3. DeviationChip.tsx
   Props: zScore: number | null
   - null → nothing rendered
   - |z| < 1 → nothing (normal)
   - 1 ≤ |z| < 2 → yellow chip "Slightly elevated"
   - |z| ≥ 2 → red chip "Significantly elevated" (or blue for below)

4. InsightCard.tsx
   Props: insight: string, dominant: EmotionLabel, date: string
   Full card with EmotionBadge, insight text, and date. Used on dashboard.

5. ChildAvatar.tsx
   Props: child: Child, size?: number
   Shows initials in a colored circle if no avatar_url, else shows the image.

─── STEP 2: WEB DASHBOARD ───────────────────────────────────────────────────

In apps/web/app/(protected)/dashboard/, build:

page.tsx — Main Dashboard
Layout:
- Top bar: Kynari logo, user email, sign out button
- Child selector: horizontal scrollable row of ChildAvatar chips
- Active child section:
    - Today's InsightCard (full width)
    - EmotionBar for today
    - "This Week" section: 7-day emotion heatmap calendar
      (each day = colored square, color = dominant emotion color)
    - "Patterns" section: line chart (Recharts) showing emotion frequencies over 30 days
      Lines: one per emotion, toggleable via legend
    - Recent sessions list: session start time, duration, dominant emotion

Data fetching:
- Use Next.js Server Components for initial data load
- Use SWR (client) for real-time updates (poll every 60s when dashboard is open)
- Create lib/api/children.ts, lib/api/summaries.ts — typed fetch functions

apps/web/app/(protected)/dashboard/[childId]/page.tsx — Child Detail
- Date picker (default today)
- Hourly timeline chart: bar chart, x-axis = hours 0–23, y-axis = event count
  Color each bar by dominant emotion for that hour
- Full event log: scrollable table with timestamp, emotion, confidence, modality
- Baseline status card: "7-day baseline forming (Day 3 of 7)" or "Baseline active"
- Export button: downloads day's data as JSON

─── STEP 3: MOBILE DASHBOARD ────────────────────────────────────────────────

In apps/mobile/app/(app)/index.tsx, build the mobile home screen.

Layout (ScrollView):
1. Header: "Good morning, [Parent Name] 👋" + date
2. Child selector: horizontal FlatList of ChildAvatar chips, tap to switch active child
3. Today's Summary Card:
   - Child name + age
   - Dominant emotion with large emoji
   - InsightCard text
   - EmotionBar (use Victory Native bar chart)
4. Quick Action: large "Start Monitoring" button → navigates to monitor screen
5. "This Week at a Glance": 7 small day pills (Mon–Sun) each colored by dominant emotion
6. Alert badge if any high-deviation events today

In apps/mobile/app/(app)/child/[id].tsx:
- Full child report screen (mirrors web child detail page)
- Use Victory Native for all charts
- Pull-to-refresh

─── STEP 4: ONBOARDING FLOW ─────────────────────────────────────────────────

Build onboarding for both web (apps/web/app/onboarding/) and mobile (apps/mobile/app/(app)/onboarding.tsx).

Steps (paginated, with progress indicator):

Step 1 — Welcome to Kynari
  - Illustration (use a simple SVG of a parent + child)
  - Headline: "Your child's emotional world, made visible"
  - Subtext: "Kynari listens for emotional tone — not words. Like a smart baby monitor for feelings."

Step 2 — How it works (privacy explainer — CRITICAL)
  - 3 animated cards:
    1. "🎤 We listen for tone" — describes prosody detection
    2. "🧠 AI runs on your phone" — "No audio ever leaves your device"
    3. "📊 Only emotion labels reach our servers" — shows the tiny event object
  - Must be clear, reassuring, and non-technical

Step 3 — Add your first child
  Form fields:
    - Name (text input)
    - Date of birth (date picker — calculates age, validates 1–5 years old)
    - Avatar (optional image picker)
  On submit: POST /children, then navigate to dashboard

Step 4 — Set up alerts (optional)
  Toggles:
    - "Alert me when frustration is high for 20+ minutes" (default ON)
    - "Alert me when unusually quiet compared to normal" (default ON)
    - "Daily summary notification at 8pm" (default ON)
  Save to user preferences in Supabase (new table: user_preferences)

Step 5 — Calibration explained
  - "For the first 7 days, Kynari learns your child's normal."
  - "You'll start seeing personalized insights after Day 7."
  - Big CTA: "Place phone in room and start"

─── STEP 5: PUSH NOTIFICATIONS ─────────────────────────────────────────────

In apps/mobile/lib/notifications.ts:

function requestPermission(): Promise<boolean>
  - expo-notifications permission request
  - Save Expo push token to Supabase (new column: users.expo_push_token)

In packages/api/services/notification_service.py:

async def send_push(expo_token: str, title: str, body: str, data: dict) -> None:
  - Calls Expo Push Notifications API
  - Handles ticket errors gracefully

async def check_and_notify(child_id: str) -> None:
  Trigger conditions (check every time a batch is received):
  1. HIGH_FRUSTRATION: >4 frustrated events in last 20 minutes → "😤 [Name] seems frustrated"
  2. UNUSUAL_QUIET: today's event count < 30% of baseline average by 3pm → "🤫 Quieter than usual today"
  3. HIGH_DEVIATION: any z-score > 2.5 → "📊 Emotional spike detected for [Name]"
  
  Only send one notification per child per hour (rate limit in Redis or Supabase)
  Respect user_preferences toggles

─── STEP 6: SUMMARY API ENDPOINTS ──────────────────────────────────────────

In packages/api/routers/summaries.py:

GET /summaries/{child_id}/today
  Returns: DailySummary for today

GET /summaries/{child_id}/week
  Returns: list[DailySummary] for last 7 days

GET /summaries/{child_id}/patterns
  Params: days (default 30)
  Returns: {
    emotion: EmotionLabel,
    weekly_pattern: { monday: float, tuesday: float, ... }  ← avg frequency per weekday
    peak_time_of_day: int  ← hour (0–23) with highest average frequency
  }[]
  (Powers the "Sunday evening stress" pattern detection)

GET /summaries/{child_id}/baseline-status
  Returns: { calibration_complete: bool, days_of_data: int, days_remaining: int }

When done, list all files created. Then describe what a parent experiences from app install to seeing their first insight — in plain English.
```

---

## 🔒 PHASE 3 — Privacy, Compliance & Performance
**Goal:** COPPA-ready, privacy-audited, battery-optimized, TestFlight ready.  
**Paste after Global Context Block.**

```
PHASE 3: Privacy, Compliance & Performance

Harden Kynari for real children's data. Every task here is non-negotiable before launch.

─── STEP 1: DATA AUDIT LOGGING ─────────────────────────────────────────────

In packages/api/, add a full data audit trail.

Create Supabase table: data_audit_log
  - id UUID PRIMARY KEY
  - user_id UUID (parent)
  - child_id UUID (nullable)
  - action TEXT (e.g., "events.batch_received", "child.created", "child.deleted", "data.exported", "data.deleted")
  - metadata JSONB (e.g., { event_count: 12, session_id: "..." })
  - ip_address TEXT
  - timestamp TIMESTAMPTZ DEFAULT NOW()

Create middleware: packages/api/middleware/audit.py
  - FastAPI middleware that logs all mutating requests (POST, PUT, DELETE) to data_audit_log
  - Never logs raw audio (there is none) — logs only metadata

─── STEP 2: DATA DELETION (RIGHT TO ERASURE) ───────────────────────────────

In packages/api/routers/children.py, add:

DELETE /children/{child_id}
  Auth: Required (must be child's parent)
  Steps:
  1. Delete all emotion_events for child (cascade already handles this via FK)
  2. Delete all daily_summaries for child
  3. Delete all child_baselines for child
  4. Delete child record
  5. Log to data_audit_log: "child.deleted"
  6. Return: { deleted: true, child_id: str }

In packages/api/routers/users.py, add:

DELETE /users/me
  Auth: Required
  Steps:
  1. Delete all children (cascade deletes everything)
  2. Delete user_preferences
  3. Delete Supabase Auth user (using service role key)
  4. Return: { deleted: true }

GET /users/me/export
  Auth: Required
  Returns: Full JSON export of all user data (children, events, summaries, baselines)
  Format:
  {
    exported_at: ISO timestamp,
    user_id: str,
    children: [{ ...child, emotion_events: [...], daily_summaries: [...] }]
  }

─── STEP 3: COPPA COMPLIANCE FLOWS ─────────────────────────────────────────

In apps/web/app/legal/ and apps/mobile/, create:

1. Parental Consent Screen (must appear before any data collection)
   - Clear statement of what data is collected (emotion labels, timestamps, child age)
   - What is NOT collected (audio, video, location, biometrics stored)
   - Checkbox: "I confirm I am the parent or legal guardian of the child(ren) in this app"
   - Checkbox: "I have read and agree to the Privacy Policy"
   - Link to privacy policy (apps/web/app/privacy/page.tsx)
   - This consent is stored in user_preferences.coppa_consent_at (timestamp)
   - Gate all data collection behind this consent

2. Privacy Policy page (apps/web/app/privacy/page.tsx)
   Write a complete, plain-English COPPA-compliant privacy policy covering:
   - What we collect (emotion event labels, child profile, device token)
   - What we DO NOT collect (audio recordings, video, precise location)
   - How data is used (personalized emotional baseline, parent dashboard)
   - Data retention (events kept 90 days, summaries kept 1 year, deletion on request)
   - Children's privacy (COPPA compliance statement)
   - Contact information (privacy@kynari.app)
   - Last updated date

3. Age gate on child profile creation
   - Validate date_of_birth results in age 1–5 years
   - If outside range, show friendly message: "Kynari is designed for toddlers ages 1–5"

─── STEP 4: SECURITY HARDENING ─────────────────────────────────────────────

In packages/api/:

1. Rate limiting
   - Install: slowapi (FastAPI rate limiter)
   - POST /events/batch: 10 requests/minute per user
   - POST /children: 5 requests/minute per user
   - All other routes: 60 requests/minute per user
   - Return 429 with Retry-After header when exceeded

2. Input validation
   - All text inputs: strip, max length 100 chars
   - child name: regex [a-zA-Z\s\-'\.]{1,50}
   - session_id: must be valid UUID format
   - timestamp: must be valid ISO 8601, not in the future, not older than 24 hours

3. HTTPS enforcement
   - Add middleware to redirect HTTP → HTTPS in production
   - Add security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

─── STEP 5: BATTERY & PERFORMANCE OPTIMIZATION ─────────────────────────────

In apps/mobile/lib/emotion/audioProcessor.ts, add adaptive sampling:

class AdaptiveSampler:
  - Default cycle: record 3s every 15s
  - Battery 20–40%: record 3s every 25s
  - Battery < 20%: record 3s every 45s, show "Low battery" warning banner
  - App in background: pause after 10 minutes, notify parent

In apps/mobile/, add performance benchmarks:

Create lib/benchmarks/inferenceSpeed.ts
  - Runs 20 inferences on a 3s silent audio buffer
  - Reports: mean latency, p95 latency, p99 latency
  - Logs to console (dev only)
  - Target: p95 < 80ms

─── STEP 6: EXPO EAS BUILD SETUP ────────────────────────────────────────────

Configure EAS Build for TestFlight + Play Store:

1. eas.json with profiles:
   - development: uses local expo-dev-client
   - preview: internal distribution (TestFlight + Play Store internal track)
   - production: App Store + Play Store

2. app.json / app.config.ts:
   - iOS: bundleIdentifier "com.kynari.app", build number auto-increment
   - Android: package "com.kynari.app", versionCode auto-increment
   - Permissions with CLEAR descriptions:
       NSMicrophoneUsageDescription: "Kynari listens for emotional tone to help you understand your child. Audio is never recorded or stored."
       NSCameraUsageDescription: "Optional: detect emotions from your child's facial expressions."

3. Apple Privacy Nutrition Label values (document in README):
   - Data Not Linked to You: Diagnostics
   - Data Not Collected: Location, Contacts, Browsing History, Search History, Purchases
   - Data Linked to You: User ID (for dashboard), Usage Data
   - NOT collected: Audio or video recordings (state this explicitly in App Store description)

─── STEP 7: END-TO-END PRIVACY TEST ────────────────────────────────────────

Create packages/api/tests/test_privacy.py

Tests:
1. test_audio_not_in_event_payload — verify EmotionEvent schema has no audio field
2. test_rls_parent_cannot_access_other_child — create 2 parents, verify parent A can't read parent B's child data
3. test_data_deletion_cascade — create child + events, delete child, verify all related rows deleted
4. test_export_includes_all_data — create data, export, verify all tables represented
5. test_rate_limiting_events — send 11 batch requests, verify 12th returns 429

Run: uv run pytest tests/test_privacy.py -v

When done, output a "Privacy Audit Summary" — a bulleted list of every privacy guarantee Kynari makes and exactly how it's technically enforced.
```

---

## 🚀 PHASE 4 — Monetization, AI Reports & Launch
**Goal:** Stripe billing live, AI narrative reports, App Store submitted, 100 users.  
**Paste after Global Context Block.**

```
PHASE 4: Monetization, AI Reports & Launch

Final phase. Add billing, AI-powered narrative reports, and submit to app stores.

─── STEP 1: FREEMIUM TIER SYSTEM ────────────────────────────────────────────

Create a tier system:

FREE tier:
  - 1 child profile
  - 7-day emotion history
  - Daily summary report
  - 2 push alert types

PRO tier ($4.99/month or $39.99/year):
  - Unlimited child profiles
  - 90-day emotion history
  - All alert types
  - AI narrative weekly report
  - Data export (JSON)
  - Priority support badge

In Supabase, add to user_preferences:
  - tier: "free" | "pro" (default "free")
  - tier_expires_at: TIMESTAMPTZ (null = free)
  - stripe_customer_id: TEXT
  - stripe_subscription_id: TEXT

In packages/api/routers/billing.py:

POST /billing/create-checkout-session
  - Creates Stripe Checkout session (monthly or annual price ID)
  - Returns { checkout_url: str }

POST /billing/webhook
  - Stripe webhook handler (verify signature with STRIPE_WEBHOOK_SECRET)
  - On checkout.session.completed: update tier to "pro", set tier_expires_at
  - On customer.subscription.deleted: downgrade to "free"

GET /billing/portal
  - Creates Stripe Customer Portal session for plan management
  - Returns { portal_url: str }

Create packages/api/middleware/tier_guard.py:
  FastAPI dependency: require_pro_tier()
  - Checks user's tier from Supabase
  - Returns 403 with { error: "pro_required", upgrade_url: "/upgrade" } if free

─── STEP 2: AI NARRATIVE WEEKLY REPORT ─────────────────────────────────────

In packages/api/services/ai_report.py:

async def generate_weekly_narrative(child_id: str, week_start: date) -> str:
  """
  Generates a warm, parent-friendly weekly narrative using Claude claude-sonnet-4-20250514.
  
  Steps:
  1. Fetch all DailySummaries for the week
  2. Fetch weekly patterns (peak emotions by day/time)
  3. Build a structured prompt (see below)
  4. Call Anthropic API
  5. Store result in new table: weekly_reports (child_id, week_start, narrative, created_at)
  6. Return narrative string
  """

Prompt template to use:
  System: "You are a warm, empathetic child development assistant. You help parents understand their toddler's emotional patterns. Speak like a knowledgeable friend, not a clinician. Keep responses under 200 words. Never diagnose. Always be encouraging."
  
  User: "Here is [Child Name]'s emotional data for the week of [date]:
  
  Daily summaries: [JSON of 7 DailySummaries]
  Notable patterns: [list of pattern insights]
  Baseline deviations: [list of significant deviations]
  
  Write a warm weekly narrative for the parent. Include:
  1. What kind of week it was emotionally (1 sentence)
  2. The most notable pattern or moment (1-2 sentences)
  3. One gentle, actionable suggestion (1 sentence)
  Keep it under 200 words."

Add background job: packages/api/jobs/weekly_report_job.py
  - Runs every Sunday at 8pm (use APScheduler)
  - For all pro-tier users, generate weekly report for the past week
  - Send push notification: "📋 [Name]'s weekly emotional report is ready"

Create API endpoint:
GET /reports/{child_id}/weekly
  Params: week_start (YYYY-MM-DD, Monday of the week)
  Requires: Pro tier
  Returns: { narrative: str, generated_at: str, week_start: str }

─── STEP 3: UPGRADE FLOW (WEB + MOBILE) ────────────────────────────────────

In apps/web/app/(protected)/upgrade/page.tsx:

Build a pricing page:
  - Two cards: Free vs Pro
  - Feature comparison table (tick/cross for each feature)
  - "Start Pro" button → calls POST /billing/create-checkout-session → redirect to Stripe

In apps/mobile/app/(app)/upgrade.tsx:
  - Same content, mobile-optimized
  - Use RevenueCat for in-app purchases (Apple + Google Play billing)
  - Install: react-native-purchases (RevenueCat SDK)
  - On purchase: POST /billing/verify-iap with receipt → backend validates and upgrades tier

Create reusable ProGate component (web + mobile):
  Props: feature: string
  If user is free → shows upgrade prompt card: "[feature] is a Kynari Pro feature" + Upgrade button
  If user is pro → renders children normally

─── STEP 4: APP STORE ASSETS ────────────────────────────────────────────────

Create a script: packages/scripts/generate_store_assets.py

Generate placeholder store listing content (text, not images):

1. App Store description (4000 chars):
   - Lead with the emotional insight hook
   - List key features with clear privacy emphasis
   - COPPA compliance statement
   - "Audio is processed on your device and never stored or transmitted"

2. Keywords (100 chars max for iOS):
   "toddler,baby monitor,child emotions,parenting,mood tracker,emotional intelligence"

3. Subtitle (30 chars):
   "Understand Your Child's Moods"

4. What's New (version 1.0.0):
   "🧒 Welcome to Kynari! First release..."

5. Support URL, Privacy Policy URL, Marketing URL

Output all of this as: docs/store_listing.md

─── STEP 5: ANALYTICS ───────────────────────────────────────────────────────

In apps/web/ and apps/mobile/, integrate PostHog (privacy-friendly analytics):

Install: posthog-js (web), posthog-react-native (mobile)

Track these events ONLY (no PII):
  - app_opened
  - monitoring_session_started (properties: child_age_months — no name)
  - monitoring_session_ended (properties: duration_minutes, emotion_event_count)
  - daily_report_viewed
  - upgrade_page_viewed
  - upgrade_completed (properties: plan: "monthly" | "annual")
  - onboarding_completed (properties: days_to_complete)

DO NOT track:
  - Any emotion labels associated with a child
  - Child names or ages beyond age_months
  - Session emotion data

Create lib/analytics.ts (web) and lib/analytics.ts (mobile):
  Wrapper functions for each event so PostHog is never called directly.

─── STEP 6: FINAL LAUNCH CHECKLIST ─────────────────────────────────────────

Create docs/LAUNCH_CHECKLIST.md with actionable checkboxes:

## Pre-Launch Technical
- [ ] All environment variables set in Vercel + Railway production
- [ ] Supabase production project created (separate from dev)
- [ ] All migrations run on production DB
- [ ] RLS policies verified on production
- [ ] Stripe production keys configured (not test keys)
- [ ] Stripe webhook endpoint configured and verified
- [ ] Expo push notification certificates configured (iOS APNS, Android FCM)
- [ ] EAS production build submitted to TestFlight
- [ ] 20+ beta testers completed TestFlight and provided feedback
- [ ] All p0 and p1 bugs from beta fixed

## App Store Submission
- [ ] App Store Connect listing complete (screenshots, description, keywords)
- [ ] Privacy Nutrition Label filled out correctly
- [ ] Privacy Policy URL live and accessible
- [ ] Age rating set to 4+ (parenting app, no objectionable content)
- [ ] In-app purchase products approved by Apple
- [ ] Apple Review submission notes prepared (explain mic usage clearly)

## Legal & Compliance
- [ ] COPPA compliance reviewed by lawyer (or documented self-assessment)
- [ ] Privacy Policy reviewed by lawyer
- [ ] Terms of Service live at kynari.app/terms
- [ ] GDPR data processing documented
- [ ] Data deletion flow tested end-to-end

## Business
- [ ] Landing page (kynari.app) live with waitlist or direct download CTA
- [ ] Social accounts created (@kynariapp)
- [ ] 3 parent testimonials from beta testers
- [ ] Press kit prepared (docs/press_kit/)
- [ ] Pricing confirmed and communicated

When done, you are ready to ship Kynari v1.0. Output a one-paragraph launch announcement for Product Hunt.
```

---

## 🔁 ITERATION PROMPT TEMPLATE
> Use this anytime you want to refine a specific feature after the phases are done.

```
KYNARI ITERATION — [Feature Name]

Context:
[Paste the relevant existing code or describe what currently exists]

Problem:
[Describe exactly what's wrong or what you want to improve]

Constraints:
- Maintain all privacy guarantees (no raw audio off device)
- Keep TypeScript types in packages/shared in sync
- FastAPI routes must stay backwards compatible
- Do not add new npm packages unless absolutely necessary

Required output:
[Describe exactly what files should be created or modified]

When done, tell me:
1. Files changed
2. Any breaking changes (API or DB schema)
3. Tests to run to verify it works
```

---

*Kynari Master Prompt v1.0 — Built for solo dev, 3–6 month timeline*  
*Stack: Next.js 15 · FastAPI (uv) · Expo · Supabase · ONNX Runtime*