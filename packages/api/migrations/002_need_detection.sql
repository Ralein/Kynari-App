-- Kynari Migration 002: Need Detection System
-- Adds tables for need-based detection, context tracking, and feedback corrections.
-- Non-destructive: existing emotion_events and related tables remain intact.

-- ─── Need Events (replaces emotion_events for new system) ───

CREATE TABLE IF NOT EXISTS need_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id            UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    session_id          TEXT NOT NULL,
    need_label          TEXT NOT NULL,            -- hungry, diaper, sleepy, pain, calm
    confidence          REAL NOT NULL,
    secondary_need      TEXT,                     -- second most likely need
    modality            TEXT NOT NULL DEFAULT 'voice',  -- voice, face, combined, context_only
    audio_features      JSONB,                    -- duration, energy, pitch, zcr
    face_distress_score REAL,                     -- 0.0–1.0 if face was analyzed
    all_needs           JSONB,                    -- full probability distribution
    fusion_weights      JSONB,                    -- weights used for fusion
    timestamp           TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_need_events_child_ts ON need_events(child_id, timestamp);

-- ─── Need Baselines ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS need_baselines (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id              UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    need_label            TEXT NOT NULL,           -- hungry, diaper, sleepy, pain, calm
    mean_frequency        REAL DEFAULT 0,
    std_deviation         REAL DEFAULT 0,
    calibration_complete  BOOLEAN DEFAULT false,
    days_of_data          INTEGER DEFAULT 0,
    last_updated          TIMESTAMPTZ DEFAULT now(),
    UNIQUE (child_id, need_label)
);

-- ─── Feedback Corrections ───────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback_corrections (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id          UUID NOT NULL,              -- references need_events(id) loosely
    child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    original_label    TEXT NOT NULL,
    corrected_label   TEXT NOT NULL,
    parent_id         TEXT NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_child ON feedback_corrections(child_id, created_at);

-- ─── Context Log (parent-provided metadata) ─────────────────

CREATE TABLE IF NOT EXISTS context_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    last_feed_at    TIMESTAMPTZ,
    last_diaper_at  TIMESTAMPTZ,
    last_nap_at     TIMESTAMPTZ,
    updated_by      TEXT NOT NULL,                -- parent_id
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (child_id)                             -- one active context per child
);

-- ─── Need Daily Summaries ───────────────────────────────────

CREATE TABLE IF NOT EXISTS need_daily_summaries (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id              UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date                  DATE NOT NULL,
    dominant_need         TEXT NOT NULL,
    need_distribution     JSONB DEFAULT '{}',
    total_events          INTEGER DEFAULT 0,
    baseline_deviation    REAL,
    insight_text          TEXT,
    created_at            TIMESTAMPTZ DEFAULT now(),
    UNIQUE (child_id, date)
);
