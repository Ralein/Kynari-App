-- Migration: 005_phase2_soundscape.sql
-- Phase 2b: Sleep Soundscape — preferences and session tracking

-- ─── Soundscape Preferences ─────────────────────────────────
CREATE TABLE IF NOT EXISTS soundscape_preferences (
    child_id        UUID PRIMARY KEY REFERENCES children(id) ON DELETE CASCADE,
    default_profile TEXT NOT NULL DEFAULT 'deep_sleep',
    auto_adapt      BOOLEAN NOT NULL DEFAULT true,
    nature_sound    TEXT NOT NULL DEFAULT 'ocean',
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Soundscape Sessions (sleep analytics) ──────────────────
CREATE TABLE IF NOT EXISTS soundscape_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    duration_minutes INT,
    avg_distress    FLOAT,
    profile_used    TEXT,
    auto_adapt_used BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_soundscape_sessions_child ON soundscape_sessions(child_id);
