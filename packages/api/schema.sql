-- Kynari Database Schema (Neon Postgres)
-- Run once against your Neon database to bootstrap all tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Children ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS children (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id       TEXT NOT NULL,
    name            TEXT NOT NULL,
    date_of_birth   DATE NOT NULL,
    avatar_url      TEXT,
    data_retention_days INTEGER DEFAULT 90,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- ─── Emotion Events ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emotion_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    session_id      TEXT NOT NULL,
    emotion_label   TEXT NOT NULL,
    confidence      REAL NOT NULL,
    modality        TEXT NOT NULL DEFAULT 'voice',
    timestamp       TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_child_ts ON emotion_events(child_id, timestamp);

-- ─── Daily Summaries ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_summaries (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id              UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date                  DATE NOT NULL,
    dominant_emotion      TEXT NOT NULL,
    emotion_distribution  JSONB DEFAULT '{}',
    total_events          INTEGER DEFAULT 0,
    baseline_deviation    REAL,
    insight_text          TEXT,
    created_at            TIMESTAMPTZ DEFAULT now(),
    UNIQUE (child_id, date)
);

-- ─── Child Baselines ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS child_baselines (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id              UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    emotion               TEXT NOT NULL,
    mean_frequency        REAL DEFAULT 0,
    std_deviation         REAL DEFAULT 0,
    calibration_complete  BOOLEAN DEFAULT false,
    days_of_data          INTEGER DEFAULT 0,
    last_updated          TIMESTAMPTZ DEFAULT now(),
    UNIQUE (child_id, emotion)
);

-- ─── Weekly Reports ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weekly_reports (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    week_start  DATE NOT NULL,
    narrative   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (child_id, week_start)
);

-- ─── User Preferences ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_preferences (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 TEXT NOT NULL UNIQUE,
    tier                    TEXT DEFAULT 'free',
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    tier_expires_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT now()
);

-- ─── Audit Logs ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         TEXT,
    action          TEXT NOT NULL,
    resource_path   TEXT,
    status_code     INTEGER,
    ip_address      TEXT,
    timestamp       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, timestamp);
