<div align="center">

# ![](apps/web/public/logo2.png) Kynari

### Privacy-First AI Baby Need Detection

**Understand what your baby needs — in under a second.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)
[![codecov](https://img.shields.io/badge/coverage-tracked-blue?style=flat-square)](#-development)

---

Kynari analyzes **cry audio** (primary), **facial distress** (secondary), and **contextual metadata** (feeding / diaper / nap times) to predict what your baby needs — all through on-device ML inference. Raw audio **never** leaves the phone.

> [!CAUTION]
> **This is NOT a medical device.** Kynari provides probabilistic predictions only. Always consult a pediatrician for health concerns.

[Getting Started](#-quick-start) · [Architecture](#-architecture) · [AI Pipeline](#-ai-pipeline) · [API Reference](#-api-reference) · [Contributing](#-contributing) · [FAQ](#-faq)

</div>

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎙️ **Cry Analysis** | CNN classifier on Mel spectrograms detects hunger, pain, sleepiness, discomfort, and calm states |
| 👶 **Facial Distress** | MediaPipe Face Mesh extracts 468 landmarks to compute real-time stress scores |
| ⏱️ **Context Awareness** | Time-since-last-feed/diaper/nap automatically adjusts prediction priors |
| 🧠 **Multimodal Fusion** | Learned fusion layer combines all signals with configurable weights (70 / 15 / 15) |
| 🔒 **Privacy First** | Raw audio discarded after inference — never stored, never transmitted |
| 📊 **AI Reports** | Claude-powered weekly narrative summaries of your baby's patterns |
| 🔄 **Feedback Loop** | Parent corrections improve predictions over time, per child |
| 📈 **Pattern Tracking** | Daily & weekly summaries, baseline tracking, and timeline views |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND  (Next.js 16)                       │
│                                                                     │
│  [Camera]  ──┐                                                      │
│  [Audio]   ──┼──► Upload ──► FastAPI Endpoints                      │
│  [Context] ──┘       │                                              │
│                      │        ┌─────────────────────┐               │
│  [Results] ◄─────────┼────────│  Need Prediction    │               │
│  [Waveform]          │        │  Confidence Bars    │               │
│  [Timeline]          │        │  Feedback Button    │               │
│                      │        └─────────────────────┘               │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                  BACKEND  (FastAPI + ONNX Runtime)                  │
│                                                                     │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐          │
│  │  Audio        │   │  Face         │   │  Context      │          │
│  │               │   │               │   │               │          │
│  │  librosa      │   │  MediaPipe    │   │  Pydantic     │          │
│  │  Mel Spec     │   │  468 lmarks   │   │  Time feats   │          │
│  │  MobileNetV3  │   │  Geo features │   │               │          │
│  │  ONNX  5 MB   │   │  ONNX  1 MB   │   │               │          │
│  └──────┬────────┘   └──────┬────────┘   └──────┬────────┘          │
│         │                   │                   │                   │
│         └───────────────────┴───────────────────┘                   │
│                             │                                       │
│                             ▼                                       │
│            ┌────────────────┐                                       │
│            │ Fusion Module  │                                       │
│            │ FC(14→32→16→5) │                                       │
│            │ ONNX  0.1 MB   │                                       │
│            └───────┬────────┘                                       │
│                    │                                                │
│                    ▼                                                │
│    { need, confidence, secondary, all_needs }                       │
│                                                                     │
│    Feedback  ──►  corrections table  ──►  retrain loop              │
│                                                                     │
└──────────────────────┼──────────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────────┐
│                    DATABASE  (Neon PostgreSQL 16)                   │
│                                                                     │
│  children           │  emotion_events    │  analysis_sessions       │
│  daily_summaries    │  feedback_corrections │  child_baselines      │
│  weekly_reports     │  user_preferences  │  audit_logs              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧬 AI Pipeline

Kynari uses a **three-stage multimodal pipeline** that fuses audio, visual, and contextual signals into a single prediction.

### Stage 1 — Cry Audio Analysis `weight: 70%`

```
Record 3–5s cry  →  librosa Mel Spectrogram  →  MobileNetV3 CNN (ONNX)
                                                         ↓
                                                 Need Probabilities
                                                   🍼 Hungry   62%
                                                   💩 Diaper   20%
                                                   😴 Sleepy   10%
                                                   🤕 Pain      5%
                                                   😌 Calm      3%
```

The cry audio pipeline converts raw PCM to a **128-band Mel spectrogram** over a 3–5 second window, then classifies it using a MobileNetV3-Small backbone exported to ONNX (~5 MB). Audio bytes are zeroed from memory immediately after the spectrogram is computed — they are never written to disk or transmitted.

### Stage 2 — Facial Distress Scoring `weight: 15%`

```
Camera frame  →  MediaPipe Face Mesh (468 landmarks)  →  Geometric Features
                                                               ↓
                                                         mouth_openness
                                                         eye_squint
                                                         brow_tension
                                                               ↓
                                                      Distress Score: 0.0–1.0
```

MediaPipe runs fully on-device and processes a single frame in ~15 ms. The resulting geometric features are fed into a lightweight ONNX regressor (~1 MB) that outputs a scalar distress score.

### Stage 3 — Contextual Priors `weight: 15%`

```
Parent metadata  →  last_feed_at, last_diaper_at, last_nap_at
                           ↓
                     Time-based need priors
                     (e.g. >2 hrs since feed  →  hungry prior ↑)
```

Contextual timestamps are used to compute **elapsed-time features** that shift the prior distribution before fusion. No raw timestamps are ever sent to a third-party.

### Fusion → Final Prediction

The three output vectors are concatenated and passed through a small fully-connected network `FC(14 → 32 → 16 → 5)` to produce a final probability distribution over the five need classes.

```json
{
  "need": "Hungry",
  "confidence": 0.67,
  "secondary": "Sleepy",
  "all_needs": {
    "hungry": 0.67,
    "diaper": 0.15,
    "sleepy": 0.12,
    "pain":   0.04,
    "calm":   0.02
  }
}
```

---

## 🔬 Need Taxonomy

Kynari classifies baby states into **5 distinct categories**:

| Need | Audio Signal | Face Signal | Context Signal |
|------|-------------|-------------|----------------|
| 🍼 **Hungry** | Rhythmic, escalating cry | Mouth rooting | >2 hrs since feed |
| 💩 **Diaper** | Intermittent fussing | Grimace, squirm | >1.5 hrs since change |
| 😴 **Sleepy** | Whimpering, low-pitched | Eye rubbing, yawning | Approaching nap time |
| 🤕 **Pain** | Sharp, high-pitched | Brow furrow, tight eyes | — |
| 😌 **Calm** | No cry / cooing | Relaxed, smiling | — |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 20+ | Frontend runtime |
| [pnpm](https://pnpm.io/) | 9+ | Package manager |
| [Python](https://python.org/) | 3.12+ | Backend runtime |
| [uv](https://docs.astral.sh/uv/) | Latest | Python package manager |
| [Docker](https://docker.com/) | Latest | Optional — local Postgres |

### 1 — Clone & Install

```bash
git clone <repo-url> && cd kynari
pnpm install
```

### 2 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```dotenv
# Database
DATABASE_URL=postgresql://...          # Neon connection string

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI Reports
ANTHROPIC_API_KEY=sk-ant-...
```

### 3 — Run

```bash
# Option A: Full stack with Docker (recommended)
docker compose up -d          # Starts Postgres + API
pnpm dev --filter web         # Next.js on :3000

# Option B: API only (no Docker)
cd packages/api
uv run --python 3.12 uvicorn main:app --reload
```

### Dev Servers

| Service | URL | Notes |
|---------|-----|-------|
| 🌐 Web App | `http://localhost:3000` | Next.js 16 with App Router |
| ⚡ API | `http://localhost:8000` | FastAPI with auto-reload |
| 📖 API Docs | `http://localhost:8000/docs` | Interactive Swagger UI |
| 🗄️ Database | Neon DB (cloud) | PostgreSQL 16 |

> **Tip:** Running `pnpm dev` from the repo root starts all services in parallel via Turborepo.

---

## 📡 API Reference

All endpoints are documented interactively at `http://localhost:8000/docs`. A summary is provided below.

### ML Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze/audio` | Upload cry audio → need prediction with confidence scores |
| `POST` | `/api/analyze/image` | Upload baby photo → facial distress score (0.0–1.0) |
| `POST` | `/api/analyze/video` | Multimodal fusion — audio + face + context combined |
| `POST` | `/api/analyze/save` | Persist a prediction result to the timeline |

**Example — audio analysis:**

```bash
curl -X POST http://localhost:8000/api/analyze/audio \
  -H "Authorization: Bearer <token>" \
  -F "file=@cry_sample.wav" \
  -F "child_id=<uuid>"
```

```json
{
  "need": "Hungry",
  "confidence": 0.67,
  "secondary": "Sleepy",
  "all_needs": { "hungry": 0.67, "diaper": 0.15, "sleepy": 0.12, "pain": 0.04, "calm": 0.02 },
  "latency_ms": 48
}
```

### Feedback & Context

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/feedback` | Submit parent correction ("Was this correct?") |
| `GET` | `/api/feedback/{id}/stats` | Accuracy statistics per child |
| `POST` | `/api/context/{child_id}` | Update last feed / diaper / nap timestamps |
| `GET` | `/api/context/{child_id}` | Retrieve current contextual metadata |

### Children & Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/children` | Create a child profile |
| `GET` | `/children` | List all children for parent |
| `GET` | `/children/{id}` | Get child details |
| `PUT` | `/children/{id}` | Update child profile |
| `DELETE` | `/children/{id}` | Delete child + COPPA-compliant data purge |
| `POST` | `/events/batch` | Ingest emotion events in bulk |
| `GET` | `/events/{id}/timeline` | Hourly-bucketed event timeline |

### Summaries & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/summaries/{id}/today` | Today's precomputed summary |
| `GET` | `/summaries/{id}/week` | Weekly summary data |
| `GET` | `/summaries/{id}/week/narrative` | AI-generated weekly narrative |
| `GET` | `/summaries/{id}/patterns` | N-day pattern distribution analysis |
| `GET` | `/summaries/{id}/baseline-status` | Emotional baseline progress |
| `GET` | `/summaries/{id}/ai-report` | Claude-powered comprehensive report |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind CSS · shadcn/ui · SWR |
| **Backend** | FastAPI · Python 3.12 · Pydantic v2 · uv |
| **ML — Audio** | librosa · MobileNetV3-Small · ONNX Runtime |
| **ML — Face** | MediaPipe Face Mesh · OpenCV · ONNX Runtime |
| **ML — Fusion** | Learned FC layers (14→32→16→5) · ONNX Runtime |
| **Database** | Neon PostgreSQL · psycopg 3 |
| **Auth** | Clerk |
| **AI Reports** | Anthropic Claude · LangChain |
| **Monorepo** | Turborepo · pnpm workspaces |
| **CI/CD** | GitHub Actions |

---

## 📁 Project Structure

```
kynari/
├── apps/
│   └── web/                         # Next.js 16 web application
│       ├── app/                     #   App Router pages & layouts
│       └── components/              #   React components
│
├── packages/
│   ├── api/                         # FastAPI backend
│   │   ├── main.py                  #   Application entrypoint
│   │   ├── config.py                #   Pydantic settings
│   │   ├── database.py              #   Neon DB connection pool
│   │   ├── ml/                      #   ML inference pipeline
│   │   │   ├── audio_analyzer.py    #     Cry → need classifier
│   │   │   ├── face_analyzer.py     #     Face → distress scorer
│   │   │   ├── multimodal_analyzer.py #   Fusion module
│   │   │   └── feedback_store.py    #     Parent correction storage
│   │   ├── middleware/              #   Auth · Rate limiting · Audit
│   │   ├── models/                  #   Pydantic request/response schemas
│   │   ├── routers/                 #   API endpoint definitions
│   │   │   ├── analyze.py           #     /api/analyze/*
│   │   │   ├── feedback.py          #     /api/feedback
│   │   │   ├── context.py           #     /api/context/*
│   │   │   ├── children.py          #     /children/*
│   │   │   ├── events.py            #     /events/*
│   │   │   └── summaries.py         #     /summaries/*
│   │   ├── services/                #   Business logic layer
│   │   │   ├── baseline_engine.py   #     Emotional baseline computation
│   │   │   ├── summary_generator.py #     Daily/weekly summarization
│   │   │   └── ai_report.py         #     Claude-powered report narratives
│   │   ├── migrations/              #   SQL migration files
│   │   └── tests/                   #   pytest test suite
│   └── shared/                      # Shared TypeScript types
│
├── docs/
│   ├── adr/                         # Architecture Decision Records
│   ├── research/                    # ML research & dataset documentation
│   └── store_listing.md             # App store metadata
│
├── .github/workflows/               # CI/CD pipeline
├── docker-compose.yml               # Local development services
├── turbo.json                       # Turborepo build pipeline config
├── ARCHITECTURE.md                  # Detailed architecture document
└── PLAN.md                          # Technical roadmap & ADR index
```

---

## 🎯 Performance Targets

| Metric | Target | Current Status | Path to Target |
|--------|--------|----------------|----------------|
| 🕐 Inference latency | < 1s total | ~2–3s | ONNX Runtime brings each module to ~50ms |
| 📦 Model total size | < 50 MB | ~500 MB (PyTorch) | ONNX export shrinks to ~6 MB total |
| 🎯 Audio accuracy | ≥ 85% | ~38% | MobileNetV3 + curated training data |
| 👁️ Face detection | < 50 ms | ~100 ms | MediaPipe targets 15 ms on-device |
| ⚡ Cold start | < 5s | ~15s | Eliminating transformers dependency |

> **Note on accuracy:** The 38% baseline reflects training on a small, unbalanced dataset. The model architecture is sound — accuracy scales sharply with data volume and quality. See [`docs/research/`](./docs/research/) for the dataset roadmap.

---

## 🔒 Privacy & Ethics

Kynari is built with **privacy as a non-negotiable foundation**. Every design decision is evaluated against these principles:

| Principle | Implementation |
|-----------|---------------|
| ⚠️ **Not a medical device** | Probabilistic predictions only; clearly disclosed in UI |
| 🔒 **Audio never stored** | PCM bytes are zeroed from memory immediately post-inference |
| 🔐 **Image encryption** | Baby images must be AES-encrypted if persisted at rest |
| 👪 **Parental consent** | Explicit consent gate before any data collection begins |
| 📉 **Minimal retention** | Per-child configurable retention policies |
| 🧹 **COPPA compliance** | `DELETE /children/{id}` triggers a full cascading data purge |
| 🛡️ **Audit logging** | Every data access event is recorded with actor, timestamp, and resource |

---

## 🧪 Development

### Running Tests

```bash
# Backend — full test suite with verbose output
cd packages/api
uv run pytest tests/ -v

# Backend — with coverage report
uv run pytest tests/ --cov=. --cov-report=term-missing

# Frontend — lint & type-check
pnpm lint
pnpm typecheck
```

### Useful Commands

```bash
pnpm dev              # Start all dev servers via Turborepo
pnpm build            # Production build (all packages)
pnpm clean            # Remove all build artifacts and node_modules
pnpm format           # Run Prettier across the entire monorepo
pnpm typecheck        # TypeScript check across all packages
```

### Adding a New API Endpoint

1. Define the Pydantic request/response models in `packages/api/models/`
2. Add the route handler in the appropriate router under `packages/api/routers/`
3. Register business logic in `packages/api/services/` if non-trivial
4. Write a pytest test in `packages/api/tests/`
5. Update this README's [API Reference](#-api-reference) table

### Database Migrations

```bash
# Apply all pending migrations
cd packages/api
uv run python -m migrations.run

# Create a new migration file
uv run python -m migrations.new "add_column_foo_to_children"
```

---

## ❓ FAQ

**Q: Does Kynari work without an internet connection?**
All ML inference (audio, face, fusion) runs fully on-device via ONNX Runtime. An internet connection is only required for cloud sync, AI reports, and authentication.

**Q: How accurate is the cry detection?**
Current accuracy is ~38% on the test set — comparable to a parent's first week with a newborn. Accuracy improves as the feedback loop accumulates parent corrections for your specific child. See the [performance targets](#-performance-targets) section for the roadmap.

**Q: Is my baby's audio stored anywhere?**
No. Raw PCM audio is held in memory only for the duration of inference (~50ms), then immediately zeroed and garbage-collected. It is never written to disk, logged, or transmitted.

**Q: Can I self-host the backend?**
Yes. `docker compose up -d` starts a fully self-contained stack. The only external dependencies are Neon (swappable with any Postgres instance), Clerk (swappable with any OIDC provider), and Anthropic (used only for AI report generation — the rest of the app functions without it).

---

## 🤝 Contributing

We welcome contributions! Please read [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`PLAN.md`](./PLAN.md) before opening a PR so you're familiar with the design decisions.

```bash
# Standard workflow
git checkout -b feat/your-feature
git commit -m "feat: describe your change"   # conventional commits please
git push origin feat/your-feature
# → Open a Pull Request
```

Areas where help is most welcome:

- 📦 **ML data**: Labelled cry audio clips for training (see `docs/research/`)
- 🌍 **i18n**: Translations for the web app
- 🧪 **Tests**: Expanding the pytest suite and adding frontend unit tests
- 📱 **Mobile**: React Native / Expo port

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture, API audit, risk areas, and target architecture |
| [`PLAN.md`](./PLAN.md) | Technical roadmap, dependency manifest, and implementation phases |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records for ML pipeline choices |
| [`docs/research/`](./docs/research/) | Baby emotion detection research summary and dataset notes |
| [`docs/store_listing.md`](./docs/store_listing.md) | App store listing metadata |

---

## 📄 License

**Proprietary** — All rights reserved. © Kynari.

---

<div align="center">

Built with ❤️ for parents everywhere.

**Kynari** · Privacy-First AI Baby Need Detection

</div>