-- Migration: 007_phase2_books.sql
-- Phase 2d: AI Picture Book — generated storybooks

-- ─── Picture Books ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS picture_books (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       TEXT NOT NULL,
    child_id        UUID REFERENCES children(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    theme           TEXT NOT NULL,                     -- adventure | bedtime | nature | friendship
    style           TEXT NOT NULL DEFAULT 'watercolor', -- watercolor | cartoon | storybook | pastel
    pages_json      JSONB NOT NULL DEFAULT '[]',       -- [{text, image_prompt, image_url}]
    child_name      TEXT,
    status          TEXT NOT NULL DEFAULT 'generating', -- generating | complete | failed
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_picture_books_parent ON picture_books(parent_id);
CREATE INDEX IF NOT EXISTS idx_picture_books_child ON picture_books(child_id);
