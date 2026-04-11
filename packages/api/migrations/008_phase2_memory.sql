-- Migration: 008_phase2_memory.sql
-- Phase 2e: Memory Garden — milestones and weekly narratives

-- ─── Milestones ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,            -- first_smile | first_laugh | first_word | first_step | custom
    title           TEXT NOT NULL,
    description     TEXT,
    caption         TEXT,                     -- AI-generated caption
    detected_at     TIMESTAMPTZ DEFAULT now(),
    source          TEXT DEFAULT 'manual',    -- manual | auto_detected
    metadata_json   JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_milestones_child ON milestones(child_id);

-- ─── Weekly Narratives ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_narratives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    week_end        DATE NOT NULL,
    narrative       TEXT NOT NULL,             -- AI-generated summary
    analysis_count  INT DEFAULT 0,
    soothe_count    INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(child_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_narratives_child ON weekly_narratives(child_id);
