# Architecture Decision Records & Blueprints

## Current Stack
- **Frontend:** Next.js 16.1.6, React 19, Tailwind CSS v4, shadcn/ui
- **Backend Legacy:** FastAPI, Python 3.12+ (Handles ML inference)
- **Backend New (BFF):** Next.js Serverless API routes with tRPC
- **Database:** Neon DB / Supabase
- **Deployment:** Vercel (Frontend + Serverless API), Modal/Fly.io (Python ML)

## Feature Under Evaluation: AI Narrative Reports (Phase 4)
- **Status:** Planning Core Endpoints
- **Architecture Shift:** All new product feature APIs will bypass FastAPI and go through a Next.js Serverless tRPC Backend-For-Frontend (BFF).
- **Tooling:** Zod for I/O validation, tRPC for strict typing, React Server Components + server actions for mutations.

## Action Plan
1. Install tRPC, React Query, and Zod dependencies in `apps/web/...`
2. Configure `apps/web/src/server/api/trpc.ts` context and bootstrap logic.
3. Build Zod schemas for the "Reports" feature endpoint.
4. Export the strictly typed tRPC router config.
5. Create strictly typed React Query hooks or Sever Action wrappers avoiding `any` or implicit returns.

_This document is the living architectural source of truth._
