-- ============================================================
-- HireMind AI – Supabase PostgreSQL Schema
-- Migration 001: Initial schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'super_admin',
    'hr_manager',
    'recruiter',
    'interviewer',
    'candidate'
);

CREATE TYPE job_status AS ENUM (
    'active',
    'onhold',
    'draft',
    'closed'
);

CREATE TYPE job_priority AS ENUM (
    'low',
    'medium',
    'high'
);

CREATE TYPE application_stage AS ENUM (
    'applied',
    'screened',
    'interview',
    'offered',
    'hired',
    'rejected'
);

CREATE TYPE match_quality AS ENUM (
    'excellent',
    'strong',
    'good',
    'fair',
    'low'
);

CREATE TYPE verification_status AS ENUM (
    'verified',
    'revoked',
    'pending',
    'unverified'
);

CREATE TYPE interview_session_type AS ENUM (
    'ai_screening',
    'technical',
    'final'
);

CREATE TYPE interview_status AS ENUM (
    'scheduled',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE channel_status AS ENUM (
    'active',
    'warning',
    'inactive',
    'standby',
    'critical'
);

CREATE TYPE message_status AS ENUM (
    'sent',
    'pending',
    'failed'
);

CREATE TYPE activity_log_type AS ENUM (
    'info',
    'success',
    'warning',
    'error'
);

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

-- users
-- Mirrors Supabase Auth users; extended with role and display name.
-- auth.users.id is the source of truth; this table holds HR-specific profile data.
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    role        user_role NOT NULL DEFAULT 'recruiter',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS
    'HR-facing user profiles linked 1-to-1 with Supabase Auth users.';

-- jobs
CREATE TABLE public.jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code     TEXT NOT NULL UNIQUE,          -- e.g. "JOB-001"
    title        TEXT NOT NULL,
    department   TEXT NOT NULL,
    location     TEXT NOT NULL,
    status       job_status NOT NULL DEFAULT 'draft',
    priority     job_priority NOT NULL DEFAULT 'medium',
    posted_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    description  TEXT,
    created_by   UUID REFERENCES public.users (id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.jobs IS
    'Job requisitions. Candidates apply to jobs through the applications table.';

-- candidates
CREATE TABLE public.candidates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    phone        TEXT,
    initials     TEXT NOT NULL,                 -- e.g. "PS" for Priya Sharma
    resume_url   TEXT,
    parsed_data  JSONB,                         -- raw AI-parsed resume blob
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.candidates IS
    'Candidate master records, independent of any specific job application.';

-- applications
-- Joins a candidate to a job; carries pipeline stage and AI scoring.
CREATE TABLE public.applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
    candidate_id    UUID NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
    ai_score        SMALLINT CHECK (ai_score BETWEEN 0 AND 100),
    match_quality   match_quality,
    stage           application_stage NOT NULL DEFAULT 'applied',
    flagged         BOOLEAN NOT NULL DEFAULT FALSE,
    applied_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, candidate_id)               -- one application per job per candidate
);

COMMENT ON TABLE public.applications IS
    'Links candidates to jobs; tracks pipeline stage and AI match scores.';

-- ai_reports
-- One AI screening report per application.
CREATE TABLE public.ai_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID NOT NULL UNIQUE REFERENCES public.applications (id) ON DELETE CASCADE,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    sentiment_score     SMALLINT CHECK (sentiment_score BETWEEN 0 AND 100),
    match_ranking       TEXT,                   -- e.g. "Strong", "Excellent"
    skill_score         SMALLINT CHECK (skill_score BETWEEN 0 AND 100),
    exp_score           SMALLINT CHECK (exp_score BETWEEN 0 AND 100),
    edu_score           SMALLINT CHECK (edu_score BETWEEN 0 AND 100),
    proj_score          SMALLINT CHECK (proj_score BETWEEN 0 AND 100),
    confidence          SMALLINT CHECK (confidence BETWEEN 0 AND 100),
    insights            TEXT,                   -- AI free-text screening notes
    tags                TEXT[],                 -- skill/keyword tags
    flagged             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_reports IS
    'AI-generated screening report per application. One-to-one with applications.';

-- interviews
CREATE TABLE public.interviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    interviewer_name TEXT NOT NULL,
    session_type    interview_session_type NOT NULL DEFAULT 'technical',
    scheduled_at    TIMESTAMPTZ NOT NULL,
    status          interview_status NOT NULL DEFAULT 'scheduled',
    score           SMALLINT CHECK (score BETWEEN 0 AND 100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.interviews IS
    'Interview sessions linked to a specific application.';

-- communication_channels
CREATE TABLE public.communication_channels (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    type             TEXT NOT NULL,             -- "Email", "SMS Gateway", etc.
    channel_id_code  TEXT NOT NULL UNIQUE,      -- "CHN-001" style identifier
    status           channel_status NOT NULL DEFAULT 'active',
    sent_volume      INT NOT NULL DEFAULT 0,
    delivered_pct    NUMERIC(5, 2) NOT NULL DEFAULT 0.00
);

COMMENT ON TABLE public.communication_channels IS
    'Configured outbound delivery channels (email, SMS, Slack, etc.).';

-- messages
CREATE TABLE public.messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
    channel_id  UUID NOT NULL REFERENCES public.communication_channels (id) ON DELETE CASCADE,
    subject     TEXT,
    body        TEXT NOT NULL,
    status      message_status NOT NULL DEFAULT 'pending',
    sent_at     TIMESTAMPTZ
);

COMMENT ON TABLE public.messages IS
    'Outbound messages sent to candidates via a communication channel.';

-- activity_logs
CREATE TABLE public.activity_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_name      TEXT NOT NULL,              -- display name or "System"
    action          TEXT NOT NULL,              -- verb phrase
    context_label   TEXT,                       -- e.g. job title / role context
    log_type        activity_log_type NOT NULL DEFAULT 'info',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_logs IS
    'Append-only audit trail of all significant system actions.';

-- settings
-- Key-value store for system-wide configuration (AI weights, notification prefs, integrations).
CREATE TABLE public.settings (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key     TEXT NOT NULL UNIQUE,
    value   JSONB NOT NULL
);

COMMENT ON TABLE public.settings IS
    'System-wide configuration store. Each row is a named JSON blob.';

-- ------------------------------------------------------------
-- SEED: default settings rows
-- ------------------------------------------------------------

INSERT INTO public.settings (key, value) VALUES
    ('ai_weights', '{"skills": 40, "experience": 30, "education": 15, "projects": 15}'),
    ('notification_prefs', '{"email": true, "slack": true, "push": false, "ai_flag": true}'),
    ('integrations', '{"linkedin": true, "naukri": true, "indeed": false, "slack": true, "email": true}');

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

CREATE INDEX idx_applications_job_id        ON public.applications (job_id);
CREATE INDEX idx_applications_candidate_id  ON public.applications (candidate_id);
CREATE INDEX idx_applications_stage         ON public.applications (stage);
CREATE INDEX idx_interviews_application_id  ON public.interviews (application_id);
CREATE INDEX idx_interviews_scheduled_at    ON public.interviews (scheduled_at);
CREATE INDEX idx_messages_candidate_id      ON public.messages (candidate_id);
CREATE INDEX idx_ai_reports_application_id  ON public.ai_reports (application_id);
CREATE INDEX idx_activity_logs_created_at   ON public.activity_logs (created_at DESC);
