# Kynari Architecture Document

## Philosophy
Every line of code is either an asset or a liability — there is no neutral code. Every function has a single responsibility. Every async operation must have a timeout, retry strategy, and circuit breaker.

## System Overview
Kynari is a Privacy-first AI emotion detection application for toddlers.
Current architecture consists of:
- **Frontend**: Next.js 16 Application (React 19, tailwindcss, swr).
- **Backend Legacy**: FastAPI Python application handling ML inference, data ingestion, and insights generation.
- **Database**: PostgreSQL (currently Supabase mapping for async execution).

## API Audit & Contract (FastAPI Legacy)

### 1. Children Router (`/children`)
- `POST /` - Create a child profile. (Input: `name, dob, avatar_url`. Output: `ChildResponse`. Risk: No explicit string sanitization limits).
- `GET /` - List children for parent. 
- `GET /{id}`, `PUT /{id}`, `DELETE /{id}` - Standard CRUD. `DELETE` triggers a COPPA right-to-delete purge function.

### 2. Events Router (`/events`)
- `POST /batch` - Ingests emotion session events in bulk. Triggers baseline engine via `BackgroundTasks`.
- `GET /{id}` - Filters events by date/session.
- `GET /{id}/timeline` - Aggregates events into hourly buckets. (**Risk:** Computes aggregation linearly in Python instead of SQL).
- `POST /{id}/generate-summary` - On-demand daily summary generation via AI/heuristics.

### 3. Summaries Router (`/summaries`)
- `GET /{id}/today`, `GET /{id}/week` - Retrieves precomputed daily summaries.
- `GET /{id}/week/narrative` - Retrieves/Generates AI weekly narrative.
- `GET /{id}/patterns` - Analytical endpoint computing N-days pattern distributions.
- `GET /{id}/baseline-status` - Progress towards standardizing emotional baseline data.
- `GET /{id}/ai-report` - Claude-powered report generation.

### 4. ML Analyze Router (`/api/analyze`)
- `POST /image`, `POST /audio`, `POST /video` - Uploads raw files for inference. Returns detected emotions, confidence, mappings.
- `POST /save` - Commits a returned inference result to the database as an event.

## Three Highest-Risk Areas
1. **Synchronous ML Inference Blocking the Event Loop**: The `/api/analyze` routes in FastAPI load images/audio into memory and pass them to compute-bound ML analyzers (`analyze_image`, `analyze_audio_bytes`, `analyze_video`). Because these are not explicitly punted to a separate threadpool or worker queue, they will block the entire asyncio event loop under load, causing catastrophic scalability failures.
2. **Missing Timeout & Circuit Breakers on DB / Heavy Calls**: Calls to DB and background tasks lack upper-bound execution timeouts. If the `baseline_engine` or `summary_generator` start failing silently, they will consume memory and workers.
3. **Inefficient Aggregations and Synchronous Saves**: The `GET /{child_id}/timeline` endpoint iterates through all rows manually in Python rather than relying on optimized SQL `DATE_TRUNC` grouping. The `POST /save` endpoint executes `baseline_engine.ingest_events` synchronously inside a DB cursor context, blocking the API response for potentially expensive computations.

## Target Architecture (Next.js + tRPC + Serverless Backend)
Moving forward, we build endpoints in **Next.js 16 API Routes** using **tRPC** for end-to-end type safety, acting as the primary Backend-For-Frontend (BFF). 
- Frontend uses **React Server Components** for data fetching and **Server Actions** for mutations.
- **Zustand** manages global client state.
- **Zod** enforces rigorous I/O contracts.
- ML models will be pushed to **Modal** serverless environments to decouple compute from the Next.js/Vercel API edge.
