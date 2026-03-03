# 🧒 Kynari

> Privacy-first AI baby need detection (ages 0–5)

Kynari analyzes **cry audio** (primary), **facial distress** (secondary), and **contextual metadata** (feeding/diaper/nap times) to predict what your baby needs. All ML inference runs on-device. Raw audio never leaves the phone.

**This is NOT a medical device.** It provides probabilistic predictions only.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      MONOREPO                            │
│                                                          │
│  apps/web/        → Next.js 16 (App Router)             │
│  packages/api/    → FastAPI + Python 3.12               │
│  packages/shared/ → TypeScript types                    │
│                                                          │
│  ┌──────────┐     ┌──────────────┐     ┌──────────┐    │
│  │  Web App │────▶│   FastAPI     │────▶│ Neon DB  │    │
│  │ :3000    │     │   :8000      │     │ Postgres │    │
│  └──────────┘     │              │     └──────────┘    │
│                   │  🎙️ Audio CNN │                      │
│                   │  👶 Face Mesh │                      │
│                   │  🧠 Fusion    │                      │
│                   └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## AI Pipeline

```
  🎙️ Audio Input (Primary — 70% weight)
  ┌─────────────────────────────────────────┐
  │  Record 3–5s cry audio                  │
  │  ↓                                      │
  │  librosa → Mel Spectrogram              │
  │  ↓                                      │
  │  HuggingFace CNN Classifier             │
  │  ↓                                      │
  │  Need Probabilities:                    │
  │    🍼 Hungry (62%)                       │
  │    💩 Diaper (20%)                       │
  │    😴 Sleepy (10%)                       │
  │    🤕 Pain (5%)                          │
  │    😌 Calm (3%)                          │
  └─────────────────────────────────────────┘

  👶 Face Input (Secondary — 15% weight)
  ┌─────────────────────────────────────────┐
  │  Camera capture                         │
  │  ↓                                      │
  │  MediaPipe Face Mesh (468 landmarks)    │
  │  ↓                                      │
  │  Stress Features:                       │
  │    mouth_openness, eye_squint,          │
  │    brow_tension                         │
  │  ↓                                      │
  │  Distress Score: 0.0 – 1.0             │
  └─────────────────────────────────────────┘

  ⏱️ Context (15% weight)
  ┌─────────────────────────────────────────┐
  │  Parent-provided metadata:              │
  │    last_feed_at, last_diaper_at,        │
  │    last_nap_at                          │
  │  ↓                                      │
  │  Time-based need priors                 │
  └─────────────────────────────────────────┘

  🧠 Fusion → Final Prediction
  ┌─────────────────────────────────────────┐
  │  {                                      │
  │    "need": "Hungry",                    │
  │    "confidence": 0.67,                  │
  │    "secondary": "Sleepy"                │
  │  }                                      │
  └─────────────────────────────────────────┘
```

## Feedback Loop

When a parent taps **"Was this correct?"** → corrections are stored.
Future versions will use accumulated feedback to personalize per baby.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Python** 3.12+
- **uv** (Python package manager)
- **Docker** (optional, for local Postgres)

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd kynari
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Neon DB and Clerk credentials

# 3. Start the API (with Docker)
docker compose up -d

# 4. Or start the API directly
cd packages/api 
uv run --python 3.12 uvicorn main:app --reload

# 5. Start the web app
pnpm dev --filter web
```

## API Endpoints

| Method | Endpoint                       | Description                         |
|--------|--------------------------------|-------------------------------------|
| POST   | `/api/analyze/audio`           | Classify baby cry → need prediction |
| POST   | `/api/analyze/image`           | Face distress scoring               |
| POST   | `/api/analyze/video`           | Multimodal fusion (audio+face+ctx)  |
| POST   | `/api/analyze/save`            | Save prediction to timeline         |
| POST   | `/api/feedback`                | Parent correction feedback          |
| GET    | `/api/feedback/{id}/stats`     | Accuracy statistics per child       |
| POST   | `/api/context/{child_id}`      | Update last feed/diaper/nap times   |
| GET    | `/api/context/{child_id}`      | Get current context                 |

## Dev Servers

| App        | URL                       |
|------------|---------------------------|
| Web        | http://localhost:3000      |
| API        | http://localhost:8000      |
| API Docs   | http://localhost:8000/docs |
| Database   | Neon DB (cloud)           |

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 16, TypeScript, Tailwind CSS|
| Backend   | FastAPI, Python 3.12, Pydantic      |
| ML Audio  | librosa, torch, HuggingFace         |
| ML Face   | MediaPipe Face Mesh, OpenCV         |
| Database  | Neon DB (PostgreSQL)                |
| Auth      | Clerk                               |
| AI Reports| Claude (Anthropic) via LangChain    |
| Monorepo  | Turborepo + pnpm workspaces         |

## Project Structure

```
kynari/
├── apps/
│   └── web/                  → Next.js 16 web app
├── packages/
│   ├── api/                  → FastAPI backend
│   │   ├── main.py           → App entrypoint
│   │   ├── config.py         → Pydantic settings
│   │   ├── database.py       → Neon DB client
│   │   ├── ml/               → ML pipeline
│   │   │   ├── audio_analyzer.py  → Cry need classifier
│   │   │   ├── face_analyzer.py   → Face distress scorer
│   │   │   ├── multimodal_analyzer.py → Fusion module
│   │   │   └── feedback_store.py  → Parent corrections
│   │   ├── middleware/       → Auth, rate limit, audit
│   │   ├── models/           → Pydantic schemas
│   │   ├── routers/          → API endpoints
│   │   │   ├── analyze.py    → ML analysis endpoints
│   │   │   ├── feedback.py   → Parent feedback
│   │   │   ├── context.py    → Contextual metadata
│   │   │   ├── children.py   → Child CRUD
│   │   │   ├── events.py     → Need events
│   │   │   └── summaries.py  → Daily/weekly summaries
│   │   ├── services/         → Business logic
│   │   │   ├── baseline_engine.py  → Need baselines
│   │   │   ├── summary_generator.py → Reports
│   │   │   └── ai_report.py  → Claude-powered narratives
│   │   ├── migrations/       → SQL migrations
│   │   └── tests/            → pytest test suite
│   └── shared/               → TypeScript types
├── .github/workflows/        → CI/CD
├── docker-compose.yml        → Local dev services
└── turbo.json                → Build pipeline
```

## Ethical & Safety Rules

- ⚠️ **Not a medical device** — probabilistic predictions only
- 🔒 Raw audio is **never stored** — discarded after inference
- 🔐 Baby images require encryption if stored
- 👪 Parental consent required
- 📉 Minimal data retention (configurable per child)

## Performance Targets

- Inference: < 1 second
- Model size: < 50MB
- Target accuracy: 70%+ on test dataset
- Mobile-compatible

## License

Private — All rights reserved.
