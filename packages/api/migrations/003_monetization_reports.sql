-- ═══════════════════════════════════════════════════════════
-- Kynari — Phase 4: Monetization & AI Reports
-- ═══════════════════════════════════════════════════════════

-- ─── User Preferences (tier, billing, consent) ─────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier            TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
    tier_expires_at TIMESTAMPTZ,
    stripe_customer_id     TEXT,
    stripe_subscription_id TEXT,
    coppa_consent_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_preferences"
    ON public.user_preferences
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ─── Weekly Reports ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id    UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    week_start  DATE NOT NULL,
    narrative   TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, week_start)
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own children reports"
    ON public.weekly_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE children.id = weekly_reports.child_id
            AND children.parent_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access to weekly_reports"
    ON public.weekly_reports
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_weekly_reports_child_week ON public.weekly_reports (child_id, week_start);
