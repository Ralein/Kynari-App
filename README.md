<div align="center">

# ![Project Preview](apps/web/public/logo1.png) Kynari

### Privacy-First AI Baby Need Detection

**Understand what your baby needs — in under a second.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#license)

---

Kynari analyzes **cry audio** (primary), **facial distress** (secondary), and **contextual metadata** (feeding / diaper / nap times) to predict what your baby needs — all through on-device ML inference. Raw audio **never** leaves the phone.

> [!CAUTION]
> **This is NOT a medical device.** Kynari provides probabilistic predictions only. Always consult a pediatrician for health concerns.

[Getting Started](#-quick-start) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Contributing](#-contributing)

</div>

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎙️ **Cry Analysis** | CNN classifier on Mel spectrograms detects hunger, pain, sleepiness, discomfort, and calm states |
| 👶 **Facial Distress** | MediaPipe Face Mesh extracts 468 landmarks to compute real-time stress scores |
| ⏱️ **Context Awareness** | Time-since-last-feed/diaper/nap automatically adjusts prediction priors |
| 🧠 **Multimodal Fusion** | Learned fusion layer combines all signals with configurable weights (70/15/15) |
| 🔒 **Privacy First** | Raw audio discarded after inference — never stored, never transmitted |
| 📊 **AI Reports** | Claude-powered weekly narrative summaries of your baby's patterns |
| 🔄 **Feedback Loop** | Parent corrections improve predictions over time per child |
| 📈 **Pattern Tracking** | Daily & weekly summaries, baseline tracking, and timeline views |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│                                                                     │
│  📷 Camera Capture ──┐                                              │
│  🎙️ Mic Recording ───┼──→ Upload ──→ FastAPI Endpoints              │
│  ⏱️ Context Input ───┘       │                                      │
│                              │      ┌─────────────────────┐         │
│  📊 Result Card ◄────────────┼──────│ Need Prediction     │         │
│  🌊 Waveform Display         │      │ Confidence Bar      │         │
│  📅 History Timeline         │      │ Feedback Button     │         │
│                              │      └─────────────────────┘         │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    BACKEND (FastAPI + ONNX Runtime)                  │
│                                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐            │
│  │ 🎙️ Audio      │  │ 👶 Face        │  │ ⏱️ Context     │            │
│  │              │  │               │  │               │            │
│  │ librosa →    │  │ MediaPipe →   │  │ Pydantic →    │            │
│  │ MelSpec →    │  │ 468 landmarks │  │ Time features │            │
│  │ MobileNetV3  │  │ → Geo feats   │  │               │            │
│  │ (ONNX, 5MB)  │  │ (ONNX, 1MB)  │  │               │            │
│  └──────┬───────┘  └──────┬────────┘  └───────┬───────┘            │
│         │                 │                    │                    │
│         └────────┬────────┴────────────────────┘                    │
│                  ▼                                                  │
│         ┌─────────────────┐                                        │
│         │ 🧠 Fusion Module │                                        │
│         │ FC(14→32→16→5)  │                                        │
│         │ ONNX, 0.1MB     │                                        │
│         └────────┬────────┘                                        │
│                  ▼                                                  │
│         { prediction, confidence, secondary, all_needs }           │
│                                                                     │
│         🔄 Feedback → corrections table → retrain loop              │
└─────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                      DATABASE (Neon Postgres)                       │
│                                                                     │
│  children │ emotion_events │ analysis_sessions │ daily_summaries    │
│  feedback_corrections │ child_baselines │ weekly_reports            │
│  user_preferences │ audit_logs                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧬 AI Pipeline

Kynari uses a **three-stage multimodal pipeline** that fuses audio, visual, and contextual signals into a single prediction:

### Stage 1 — Cry Audio Analysis (70% weight)

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

### Stage 2 — Facial Distress Scoring (15% weight)

```
Camera frame  →  MediaPipe Face Mesh (468 landmarks)  →  Geometric Features
                                                              ↓
                                                        mouth_openness
                                                        eye_squint
                                                        brow_tension
                                                              ↓
                                                     Distress Score: 0.0–1.0
```

### Stage 3 — Contextual Priors (15% weight)

```
Parent metadata  →  last_feed_at, last_diaper_at, last_nap_at
                          ↓
                    Time-based need priors (e.g., >2hrs since feed → hungry prior ↑)
```

### Fusion → Final Prediction

```json
{
  "need": "Hungry",
  "confidence": 0.67,
  "secondary": "Sleepy",
  "all_needs": { "hungry": 0.67, "diaper": 0.15, "sleepy": 0.12, "pain": 0.04, "calm": 0.02 }
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

### Installation

```bash
# 1 — Clone the repository
git clone <repo-url> && cd kynari

# 2 — Install dependencies
pnpm install

# 3 — Configure environment
cp .env.example .env
# → Edit .env with your Neon DB URL, Clerk keys, and Anthropic API key
```

### Running Locally

```bash
# Option A: Full stack with Docker
docker compose up -d          # Starts Postgres + API
pnpm dev --filter web         # Starts Next.js on :3000

# Option B: API only (no Docker)
cd packages/api
uv run --python 3.12 uvicorn main:app --reload   # API on :8000
```

### Dev Servers

| Service | URL | Notes |
|---------|-----|-------|
| 🌐 Web App | `http://localhost:3000` | Next.js 16 with App Router |
| ⚡ API | `http://localhost:8000` | FastAPI with auto-reload |
| 📖 API Docs | `http://localhost:8000/docs` | Interactive Swagger UI |
| 🗄️ Database | Neon DB (cloud) | PostgreSQL 16 |

---

## 📡 API Reference

### ML Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze/audio` | Upload cry audio → need prediction with confidence scores |
| `POST` | `/api/analyze/image` | Upload baby photo → facial distress score (0.0–1.0) |
| `POST` | `/api/analyze/video` | Multimodal fusion — audio + face + context combined |
| `POST` | `/api/analyze/save` | Persist a prediction result to the timeline |

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

<table>
<tr>
<td><strong>Layer</strong></td>
<td><strong>Technology</strong></td>
</tr>
<tr>
<td>Frontend</td>
<td>Next.js 16 · React 19 · TypeScript · Tailwind CSS · shadcn/ui · SWR</td>
</tr>
<tr>
<td>Backend</td>
<td>FastAPI · Python 3.12 · Pydantic v2 · uv</td>
</tr>
<tr>
<td>ML — Audio</td>
<td>librosa · MobileNetV3-Small · ONNX Runtime</td>
</tr>
<tr>
<td>ML — Face</td>
<td>MediaPipe Face Mesh · OpenCV · ONNX Runtime</td>
</tr>
<tr>
<td>ML — Fusion</td>
<td>Learned FC layers (14→32→16→5) · ONNX Runtime</td>
</tr>
<tr>
<td>Database</td>
<td>Neon PostgreSQL · psycopg 3</td>
</tr>
<tr>
<td>Auth</td>
<td>Clerk</td>
</tr>
<tr>
<td>AI Reports</td>
<td>Anthropic Claude · LangChain</td>
</tr>
<tr>
<td>Monorepo</td>
<td>Turborepo · pnpm workspaces</td>
</tr>
<tr>
<td>CI/CD</td>
<td>GitHub Actions</td>
</tr>
</table>

---

## 📁 Project Structure

```
kynari/
├── apps/
│   └── web/                        # Next.js 16 web application
│       ├── app/                    #   App Router pages & layouts
│       └── components/             #   React components
│
├── packages/
│   ├── api/                        # FastAPI backend
│   │   ├── main.py                 #   Application entrypoint
│   │   ├── config.py               #   Pydantic settings
│   │   ├── database.py             #   Neon DB connection pool
│   │   ├── ml/                     #   ML inference pipeline
│   │   │   ├── audio_analyzer.py   #     Cry → need classifier
│   │   │   ├── face_analyzer.py    #     Face → distress scorer
│   │   │   ├── multimodal_analyzer.py  # Fusion module
│   │   │   └── feedback_store.py   #     Parent correction storage
│   │   ├── middleware/             #   Auth · Rate limiting · Audit
│   │   ├── models/                 #   Pydantic request/response schemas
│   │   ├── routers/                #   API endpoint definitions
│   │   │   ├── analyze.py          #     /api/analyze/*
│   │   │   ├── feedback.py         #     /api/feedback
│   │   │   ├── context.py          #     /api/context/*
│   │   │   ├── children.py         #     /children/*
│   │   │   ├── events.py           #     /events/*
│   │   │   └── summaries.py        #     /summaries/*
│   │   ├── services/               #   Business logic layer
│   │   │   ├── baseline_engine.py  #     Emotional baseline computation
│   │   │   ├── summary_generator.py #    Daily/weekly summarization
│   │   │   └── ai_report.py        #    Claude-powered report narratives
│   │   ├── migrations/             #   SQL migration files
│   │   └── tests/                  #   pytest test suite
│   └── shared/                     # Shared TypeScript types
│
├── docs/
│   ├── adr/                        # Architecture Decision Records
│   ├── research/                   # ML research & dataset documentation
│   └── store_listing.md            # App store metadata
│
├── .github/workflows/              # CI/CD pipeline
├── docker-compose.yml              # Local development services
├── turbo.json                      # Turborepo build pipeline config
├── ARCHITECTURE.md                 # Detailed architecture document
└── PLAN.md                         # Technical roadmap & ADR index
```

---

## 🎯 Performance Targets

| Metric | Target | Current | Strategy |
|--------|--------|---------|----------|
| 🕐 Inference latency | < 1s total | ~2–3s | ONNX Runtime (~50ms per module) |
| 📦 Model total size | < 50 MB | ~500 MB (PyTorch) | ONNX export (~6 MB total) |
| 🎯 Audio accuracy | ≥ 85% | ~38% | MobileNetV3 + proper training data |
| 👁️ Face detection | < 50 ms | ~100 ms | MediaPipe (15 ms) |
| ⚡ Cold start | < 5s | ~15s | Drop transformers, use ONNX |

---

## 🔒 Privacy & Ethics

Kynari is built with **privacy as a non-negotiable foundation**:

- ⚠️ **Not a medical device** — probabilistic predictions only; never replace professional care
- 🔒 **Raw audio is never stored** — discarded immediately after inference
- 🔐 **Encryption required** — baby images must be encrypted if persisted
- 👪 **Parental consent** — required before any data collection
- 📉 **Minimal retention** — configurable per-child data retention policies
- 🧹 **COPPA compliance** — `DELETE /children/{id}` triggers full data purge
- 🛡️ **Audit logging** — all data access is tracked

---

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd packages/api
uv run pytest tests/ -v

# Frontend lint & typecheck
pnpm lint
pnpm typecheck
```

### Useful Commands

```bash
pnpm dev              # Start all dev servers (Turborepo)
pnpm build            # Production build
pnpm clean            # Clean all build artifacts + node_modules
pnpm format           # Prettier format all files
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/amazing-feature`)
3. **Commit** with conventional commits (`git commit -m "feat: add sleep detection"`)
4. **Push** to your branch (`git push origin feat/amazing-feature`)
5. **Open** a Pull Request

> Please read `ARCHITECTURE.md` and `PLAN.md` before contributing to understand design decisions.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture, API audit, risk areas, and target architecture |
| [`PLAN.md`](./PLAN.md) | Technical roadmap, dependency manifest, and implementation phases |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records for ML pipeline choices |
| [`docs/research/`](./docs/research/) | Baby emotion detection research summary |
| [`docs/store_listing.md`](./docs/store_listing.md) | App store listing metadata |

---

## 📄 License

**Proprietary** — All rights reserved.

---

<div align="center">

Built with ❤️ for parents everywhere.

**Kynari** · Privacy-First AI Baby Need Detection

</div>
