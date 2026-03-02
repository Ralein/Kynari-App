-- ═══════════════════════════════════════════════════════════
-- Kynari — Phase 3: Security, Audit & Retention
-- ═══════════════════════════════════════════════════════════

-- ─── Audit Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action        TEXT NOT NULL,
    resource_path TEXT NOT NULL,
    status_code   INT,
    ip_address    INET,
    timestamp     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id, timestamp);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs (timestamp);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to audit logs"
    ON public.audit_logs
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ─── COPPA Data Retention ──────────────────────────────────
ALTER TABLE public.children
    ADD COLUMN IF NOT EXISTS data_retention_days INT DEFAULT 90;

-- ─── Query Optimization Indexes ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emotion_events_child_emotion_date
    ON public.emotion_events (child_id, emotion_label, timestamp);

CREATE INDEX IF NOT EXISTS idx_emotion_events_created_at
    ON public.emotion_events (created_at);
