-- ═══════════════════════════════════════════════════════════
-- Kynari — Initial Schema Migration
-- Tables: children, emotion_events, daily_summaries, child_baselines
-- All tables have Row Level Security (RLS) enabled.
-- ═══════════════════════════════════════════════════════════

-- ─── Children ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.children (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    avatar_url  TEXT
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own children"
    ON public.children FOR SELECT
    USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own children"
    ON public.children FOR INSERT
    WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own children"
    ON public.children FOR UPDATE
    USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own children"
    ON public.children FOR DELETE
    USING (auth.uid() = parent_id);


-- ─── Emotion Events ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.emotion_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id      UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    session_id    UUID NOT NULL,
    emotion_label TEXT NOT NULL CHECK (emotion_label IN ('happy','sad','angry','fearful','neutral','frustrated')),
    confidence    FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    modality      TEXT NOT NULL CHECK (modality IN ('voice','face','combined')),
    timestamp     TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emotion_events_child_date ON public.emotion_events (child_id, timestamp);
CREATE INDEX idx_emotion_events_session ON public.emotion_events (session_id);

ALTER TABLE public.emotion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own child events"
    ON public.emotion_events FOR SELECT
    USING (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can insert events for own children"
    ON public.emotion_events FOR INSERT
    WITH CHECK (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can delete own child events"
    ON public.emotion_events FOR DELETE
    USING (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );


-- ─── Daily Summaries ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_summaries (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id             UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    date                 DATE NOT NULL,
    dominant_emotion     TEXT NOT NULL,
    emotion_distribution JSONB NOT NULL,
    total_events         INTEGER NOT NULL DEFAULT 0,
    baseline_deviation   FLOAT,
    insight_text         TEXT,
    UNIQUE(child_id, date)
);

CREATE INDEX idx_daily_summaries_child_date ON public.daily_summaries (child_id, date);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own child summaries"
    ON public.daily_summaries FOR SELECT
    USING (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can insert summaries for own children"
    ON public.daily_summaries FOR INSERT
    WITH CHECK (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can update own child summaries"
    ON public.daily_summaries FOR UPDATE
    USING (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );


-- ─── Child Baselines ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.child_baselines (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id              UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    emotion               TEXT NOT NULL,
    mean_frequency        FLOAT NOT NULL DEFAULT 0,
    std_deviation         FLOAT NOT NULL DEFAULT 0,
    calibration_complete  BOOLEAN DEFAULT FALSE,
    days_of_data          INTEGER DEFAULT 0,
    last_updated          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, emotion)
);

ALTER TABLE public.child_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own child baselines"
    ON public.child_baselines FOR SELECT
    USING (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can insert baselines for own children"
    ON public.child_baselines FOR INSERT
    WITH CHECK (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );

CREATE POLICY "Parents can update own child baselines"
    ON public.child_baselines FOR UPDATE
    USING (
        child_id IN (
            SELECT id FROM public.children WHERE parent_id = auth.uid()
        )
    );
