# 🧒 Kynari

> Privacy-first AI emotion detection for toddlers (ages 0–5)

Kynari listens for emotional tone — not words — and helps parents understand their child's emotional patterns. All ML inference runs on-device. Raw audio never leaves the phone.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    MONOREPO                      │
│                                                  │
│  apps/web/        → Next.js 16 (App Router)     │
│  packages/api/    → FastAPI + Python 3.12       │
│  packages/shared/ → TypeScript types            │
│                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐ │
│  │  Web App │────▶│  FastAPI  │────▶│ Supabase │ │
│  │ :3000    │     │  :8000   │     │ Postgres │ │
│  └──────────┘     └──────────┘     └──────────┘ │
└─────────────────────────────────────────────────┘
```

## Data Flow

```
  Phone (on-device)                    Cloud
  ┌─────────────┐                ┌──────────────┐
  │ Audio 🎤    │                │              │
  │   ↓         │                │   FastAPI    │
  │ ONNX Model  │  ───────────▶ │   ↓          │
  │   ↓         │   emotion     │  Supabase    │
  │ {label,     │   labels      │   ↓          │
  │  confidence,│   only        │  Dashboard   │
  │  timestamp} │                │              │
  └─────────────┘                └──────────────┘
       ⚠️ Audio is DISCARDED
         immediately after inference
```

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
# Edit .env with your Supabase credentials

# 3. Start the API (with Docker)
docker compose up -d

# 4. Or start the API directly
cd packages/api && uv sync && uv run uvicorn main:app --reload

# 5. Start the web app
pnpm dev --filter web
```

## Dev Servers

| App        | URL                     |
|------------|-------------------------|
| Web        | http://localhost:3000    |
| API        | http://localhost:8000    |
| API Docs   | http://localhost:8000/docs |
| Database   | localhost:5432          |

## Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | Next.js 16, TypeScript, Tailwind CSS |
| Backend   | FastAPI, Python 3.12, Pydantic |
| Database  | Supabase (PostgreSQL)         |
| Auth      | Supabase Auth (magic link)    |
| Monorepo  | Turborepo + pnpm workspaces   |
| CI/CD     | GitHub Actions                |

## Project Structure

```
kynari/
├── apps/
│   └── web/                  → Next.js 16 web app
├── packages/
│   ├── api/                  → FastAPI backend
│   │   ├── main.py           → App entrypoint
│   │   ├── config.py         → Pydantic settings
│   │   ├── database.py       → Supabase client
│   │   ├── middleware/       → Auth middleware
│   │   ├── models/           → Pydantic schemas
│   │   ├── routers/          → API endpoints
│   │   ├── services/         → Business logic
│   │   └── migrations/       → SQL migrations
│   └── shared/               → TypeScript types
├── .github/workflows/        → CI/CD
├── docker-compose.yml        → Local dev services
└── turbo.json                → Build pipeline
```

## License

Private — All rights reserved.
