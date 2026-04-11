-- Migration: 006_phase2_voice.sql
-- Phase 2c: Voice Lullaby Studio — voice preferences and lullaby catalogue

-- ─── Voice Preferences (selected voice per parent) ──────────
CREATE TABLE IF NOT EXISTS voice_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       TEXT NOT NULL,                    -- Clerk user ID
    selected_voice  TEXT NOT NULL DEFAULT 'af_sarah', -- Kokoro voice ID
    label           TEXT NOT NULL DEFAULT 'Default',  -- friendly name
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_prefs_parent ON voice_preferences(parent_id);

-- ─── Lullaby Playback Log (for analytics) ───────────────────
CREATE TABLE IF NOT EXISTS lullaby_plays (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       TEXT NOT NULL,
    child_id        UUID REFERENCES children(id) ON DELETE SET NULL,
    lullaby_id      TEXT NOT NULL,
    voice_used      TEXT NOT NULL,
    duration_seconds INT,
    played_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lullaby_plays_parent ON lullaby_plays(parent_id);
