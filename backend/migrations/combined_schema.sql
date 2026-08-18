-- ============================================================
-- HireMind AI – Clean Supabase PostgreSQL DDL Schema
-- Copy and paste this file into Supabase → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM TYPES
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('super_admin', 'hr_manager', 'recruiter', 'interviewer', 'candidate');

DROP TYPE IF EXISTS job_status CASCADE;
CREATE TYPE job_status AS ENUM ('active', 'onhold', 'draft', 'closed');

DROP TYPE IF EXISTS job_priority CASCADE;
CREATE TYPE job_priority AS ENUM ('low', 'medium', 'high');

DROP TYPE IF EXISTS application_stage CASCADE;
CREATE TYPE application_stage AS ENUM ('applied', 'screened', 'shortlisted', 'assignment_sent', 'assignment_submitted', 'assignment_reviewed', 'tech_round', 'tech_round_completed', 'interview_round', 'interview_round_completed', 'speaking_round', 'speaking_round_completed', 'hr_round', 'hr_round_completed', 'offered', 'hired', 'rejected', 'waitlisted');

DROP TYPE IF EXISTS match_quality CASCADE;
CREATE TYPE match_quality AS ENUM ('excellent', 'strong', 'good', 'fair', 'low');

DROP TYPE IF EXISTS verification_status CASCADE;
CREATE TYPE verification_status AS ENUM ('verified', 'revoked', 'pending', 'unverified');

DROP TYPE IF EXISTS interview_session_type CASCADE;
CREATE TYPE interview_session_type AS ENUM ('ai_screening', 'technical', 'final');

DROP TYPE IF EXISTS interview_status CASCADE;
CREATE TYPE interview_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

DROP TYPE IF EXISTS channel_status CASCADE;
CREATE TYPE channel_status AS ENUM ('active', 'warning', 'inactive', 'standby', 'critical');

DROP TYPE IF EXISTS message_status CASCADE;
CREATE TYPE message_status AS ENUM ('sent', 'pending', 'failed');

DROP TYPE IF EXISTS activity_log_type CASCADE;
CREATE TYPE activity_log_type AS ENUM ('info', 'success', 'warning', 'error');

DROP TYPE IF EXISTS assignment_status CASCADE;
CREATE TYPE assignment_status AS ENUM ('pending', 'submitted', 'reviewed');

DROP TYPE IF EXISTS ai_round_type CASCADE;
CREATE TYPE ai_round_type AS ENUM ('tech', 'interview', 'speaking', 'hr');

DROP TYPE IF EXISTS ai_round_status CASCADE;
CREATE TYPE ai_round_status AS ENUM ('not_started', 'in_progress', 'completed');

DROP TYPE IF EXISTS recommendation_level CASCADE;
CREATE TYPE recommendation_level AS ENUM ('strongly_recommended', 'recommended', 'consider', 'not_recommended');

-- TABLES
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'recruiter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    status job_status NOT NULL DEFAULT 'draft',
    priority job_priority NOT NULL DEFAULT 'medium',
    posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    initials TEXT NOT NULL,
    resume_url TEXT,
    parsed_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
    ai_score SMALLINT CHECK (ai_score BETWEEN 0 AND 100),
    match_quality match_quality,
    stage application_stage NOT NULL DEFAULT 'applied',
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, candidate_id)
);

CREATE TABLE public.ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES public.applications (id) ON DELETE CASCADE,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    sentiment_score SMALLINT CHECK (sentiment_score BETWEEN 0 AND 100),
    match_ranking TEXT,
    skill_score SMALLINT CHECK (skill_score BETWEEN 0 AND 100),
    exp_score SMALLINT CHECK (exp_score BETWEEN 0 AND 100),
    edu_score SMALLINT CHECK (edu_score BETWEEN 0 AND 100),
    proj_score SMALLINT CHECK (proj_score BETWEEN 0 AND 100),
    confidence SMALLINT CHECK (confidence BETWEEN 0 AND 100),
    insights TEXT,
    tags TEXT[],
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    interviewer_name TEXT NOT NULL,
    session_type interview_session_type NOT NULL DEFAULT 'technical',
    scheduled_at TIMESTAMPTZ NOT NULL,
    status interview_status NOT NULL DEFAULT 'scheduled',
    score SMALLINT CHECK (score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.communication_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    channel_id_code TEXT NOT NULL UNIQUE,
    status channel_status NOT NULL DEFAULT 'active',
    sent_volume INT NOT NULL DEFAULT 0,
    delivered_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.communication_channels (id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT NOT NULL,
    status message_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ
);

CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    context_label TEXT,
    log_type activity_log_type NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL
);

CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    submission_url TEXT,
    submission_text TEXT,
    status assignment_status NOT NULL DEFAULT 'pending',
    ai_evaluation JSONB,
    score SMALLINT CHECK (score BETWEEN 0 AND 100),
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_interview_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    round_type ai_round_type NOT NULL,
    transcript JSONB DEFAULT '[]'::jsonb,
    status ai_round_status NOT NULL DEFAULT 'not_started',
    ai_score SMALLINT CHECK (ai_score BETWEEN 0 AND 100),
    ai_summary TEXT,
    strengths TEXT[],
    concerns TEXT[],
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    requires_ai_reprocessing BOOLEAN DEFAULT false,
    ai_review_completed BOOLEAN DEFAULT true,
    evaluation_status TEXT DEFAULT 'verified',
    evaluation_engine TEXT DEFAULT 'llm',
    evaluation_model TEXT DEFAULT 'Gemini',
    evaluation_version INT DEFAULT 2,
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMPTZ DEFAULT NULL,
    reviewed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE public.final_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES public.applications (id) ON DELETE CASCADE,
    resume_score SMALLINT CHECK (resume_score BETWEEN 0 AND 100),
    assignment_score SMALLINT CHECK (assignment_score BETWEEN 0 AND 100),
    tech_score SMALLINT CHECK (tech_score BETWEEN 0 AND 100),
    interview_score SMALLINT CHECK (interview_score BETWEEN 0 AND 100),
    hr_score SMALLINT CHECK (hr_score BETWEEN 0 AND 100),
    final_score SMALLINT CHECK (final_score BETWEEN 0 AND 100),
    recommendation recommendation_level NOT NULL,
    reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.candidate_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    round_type ai_round_type NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DEFAULT SETTINGS
INSERT INTO public.settings (key, value) VALUES
    ('ai_weights', '{"skills": 40, "experience": 30, "education": 15, "projects": 15}'),
    ('notification_prefs', '{"email": true, "slack": true, "push": false, "ai_flag": true}'),
    ('integrations', '{"linkedin": true, "naukri": true, "indeed": false, "slack": true, "email": true}'),
    ('shortlist_threshold', '{"value": 70}')
ON CONFLICT (key) DO NOTHING;

-- ROW LEVEL SECURITY POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interview_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ai_rounds" ON public.ai_interview_rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_recommendations" ON public.final_recommendations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tokens" ON public.candidate_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
