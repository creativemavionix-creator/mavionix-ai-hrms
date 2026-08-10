-- ============================================================
-- HireMind AI – Migration 003
-- 1. Add `source` column to candidates for analytics
-- 2. Seed default communication_channels rows
-- Run AFTER 002_row_level_security.sql
-- ============================================================

-- Add source column to candidates
ALTER TABLE public.candidates
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct'
        CHECK (source IN ('linkedin','referral','naukri','indeed','direct'));

CREATE INDEX IF NOT EXISTS idx_candidates_source ON public.candidates (source);

-- ── Seed default communication channels ────────────────────────────────────
-- Safe to re-run (ON CONFLICT DO NOTHING)
INSERT INTO public.communication_channels
    (name, type, channel_id_code, status, sent_volume, delivered_pct)
VALUES
    ('Email Candidate Updates',    'Email',                    'CHN-001', 'active',  1482, 99.40),
    ('Interview Reminders',        'SMS & Email',              'CHN-002', 'active',  3845, 98.70),
    ('Offer Letter Notifications', 'Secure Email + DocuSign',  'CHN-003', 'active',  184,  100.00),
    ('SMS Notifications',          'SMS Gateway',              'CHN-004', 'warning', 5211, 92.10),
    ('Rejection Templates',        'Email',                    'CHN-005', 'standby', 894,  99.10)
ON CONFLICT (channel_id_code) DO NOTHING;
