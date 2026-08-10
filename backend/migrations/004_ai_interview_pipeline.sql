-- ============================================================
-- HireMind AI – Migration 004: AI Interview Pipeline
-- Extends the recruitment pipeline with sub-stages, assignments,
-- AI interview rounds, and final recommendations.
-- Run AFTER 003_candidates_source_channels_seed.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Replace the application_stage enum with the full pipeline
-- ────────────────────────────────────────────────────────────

-- PostgreSQL doesn't support ALTER TYPE ... ADD VALUE inside a transaction
-- on all versions, so we recreate the type via a column swap approach.

-- Add new values to the existing enum (safe to run multiple times with IF NOT EXISTS on PG 12+)
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'shortlisted';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assignment_sent';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assignment_submitted';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assignment_reviewed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'tech_round';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'tech_round_completed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'interview_round';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'interview_round_completed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'hr_round';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'hr_round_completed';

-- Full ordered list of valid stages (for reference):
-- applied → screened → shortlisted → assignment_sent → assignment_submitted
-- → assignment_reviewed → tech_round → tech_round_completed → interview_round
-- → interview_round_completed → hr_round → hr_round_completed → offered → hired
-- (rejected can happen from any stage)

-- ────────────────────────────────────────────────────────────
-- 2. New table: assignments
-- ────────────────────────────────────────────────────────────

CREATE TYPE assignment_status AS ENUM ('pending', 'submitted', 'reviewed');

CREATE TABLE public.assignments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL,
    requirements      TEXT,
    submission_url    TEXT,
    submission_text   TEXT,
    status            assignment_status NOT NULL DEFAULT 'pending',
    ai_evaluation     JSONB,              -- structured AI review of the submission
    score             SMALLINT CHECK (score BETWEEN 0 AND 100),
    deadline          TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.assignments IS
    'Take-home assignments sent to shortlisted candidates. One per application.';

CREATE INDEX idx_assignments_application_id ON public.assignments (application_id);
CREATE INDEX idx_assignments_status         ON public.assignments (status);

-- ────────────────────────────────────────────────────────────
-- 3. New table: ai_interview_rounds
-- ────────────────────────────────────────────────────────────

CREATE TYPE ai_round_type AS ENUM ('tech', 'interview', 'hr');
CREATE TYPE ai_round_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TABLE public.ai_interview_rounds (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    round_type        ai_round_type NOT NULL,
    transcript        JSONB DEFAULT '[]'::jsonb,   -- [{role, message, timestamp}, ...]
    status            ai_round_status NOT NULL DEFAULT 'not_started',
    ai_score          SMALLINT CHECK (ai_score BETWEEN 0 AND 100),
    ai_summary        TEXT,
    strengths         TEXT[],
    concerns          TEXT[],
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_interview_rounds IS
    'AI-conducted interview rounds (tech, behavioral, HR). Stores full transcript and evaluation.';

CREATE INDEX idx_ai_rounds_application_id ON public.ai_interview_rounds (application_id);
CREATE INDEX idx_ai_rounds_status         ON public.ai_interview_rounds (status);

-- ────────────────────────────────────────────────────────────
-- 4. New table: final_recommendations
-- ────────────────────────────────────────────────────────────

CREATE TYPE recommendation_level AS ENUM (
    'strongly_recommended',
    'recommended',
    'consider',
    'not_recommended'
);

CREATE TABLE public.final_recommendations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID NOT NULL UNIQUE REFERENCES public.applications (id) ON DELETE CASCADE,
    resume_score      SMALLINT CHECK (resume_score BETWEEN 0 AND 100),
    assignment_score  SMALLINT CHECK (assignment_score BETWEEN 0 AND 100),
    tech_score        SMALLINT CHECK (tech_score BETWEEN 0 AND 100),
    interview_score   SMALLINT CHECK (interview_score BETWEEN 0 AND 100),
    hr_score          SMALLINT CHECK (hr_score BETWEEN 0 AND 100),
    final_score       SMALLINT CHECK (final_score BETWEEN 0 AND 100),
    recommendation    recommendation_level NOT NULL,
    reasoning         TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.final_recommendations IS
    'Aggregated AI recommendation combining all pipeline stage scores.';

CREATE INDEX idx_final_rec_application_id ON public.final_recommendations (application_id);

-- ────────────────────────────────────────────────────────────
-- 5. Auto-shortlist trigger
--    When ai_score on applications crosses the threshold stored
--    in settings.ai_weights (key: 'shortlist_threshold', default 70),
--    auto-advance stage to 'shortlisted' and log it.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_shortlist_on_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    threshold INT;
    setting_val JSONB;
    cand_name TEXT;
    job_title TEXT;
BEGIN
    -- Only trigger when ai_score is set/updated and stage is still early
    IF NEW.ai_score IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.stage NOT IN ('applied', 'screened') THEN
        RETURN NEW;
    END IF;

    -- Read threshold from settings (default 70)
    SELECT value INTO setting_val
    FROM public.settings
    WHERE key = 'shortlist_threshold';

    IF setting_val IS NOT NULL THEN
        threshold := (setting_val ->> 'value')::INT;
    ELSE
        threshold := 70;
    END IF;

    -- Check if score meets threshold
    IF NEW.ai_score >= threshold THEN
        NEW.stage := 'shortlisted';

        -- Log to activity_logs
        SELECT c.name INTO cand_name
        FROM public.candidates c
        WHERE c.id = NEW.candidate_id;

        SELECT j.title INTO job_title
        FROM public.jobs j
        WHERE j.id = NEW.job_id;

        INSERT INTO public.activity_logs (actor_name, action, context_label, log_type)
        VALUES (
            COALESCE(cand_name, 'Unknown'),
            'auto-shortlisted by AI (score: ' || NEW.ai_score || ' ≥ threshold: ' || threshold || ') for',
            COALESCE(job_title, 'Unknown Role'),
            'success'
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to applications table
DROP TRIGGER IF EXISTS trg_auto_shortlist ON public.applications;
CREATE TRIGGER trg_auto_shortlist
    BEFORE INSERT OR UPDATE OF ai_score
    ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_shortlist_on_score();

-- ────────────────────────────────────────────────────────────
-- 6. Seed the shortlist_threshold setting (default 70)
-- ────────────────────────────────────────────────────────────

INSERT INTO public.settings (key, value)
VALUES ('shortlist_threshold', '{"value": 70}')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 7. RLS for new tables (HR staff full access, candidates own-only)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interview_rounds  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_recommendations ENABLE ROW LEVEL SECURITY;

-- HR staff: full access
CREATE POLICY "hr_staff_all_assignments"
ON public.assignments FOR ALL
USING (public.is_hr_staff())
WITH CHECK (public.is_hr_staff());

CREATE POLICY "hr_staff_all_ai_rounds"
ON public.ai_interview_rounds FOR ALL
USING (public.is_hr_staff())
WITH CHECK (public.is_hr_staff());

CREATE POLICY "hr_staff_all_recommendations"
ON public.final_recommendations FOR ALL
USING (public.is_hr_staff())
WITH CHECK (public.is_hr_staff());

-- Candidates: see only their own
CREATE POLICY "candidate_own_assignments"
ON public.assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = assignments.application_id
          AND a.candidate_id = public.auth_candidate_id()
    )
);

CREATE POLICY "candidate_own_ai_rounds"
ON public.ai_interview_rounds FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = ai_interview_rounds.application_id
          AND a.candidate_id = public.auth_candidate_id()
    )
);

CREATE POLICY "candidate_own_recommendations"
ON public.final_recommendations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = final_recommendations.application_id
          AND a.candidate_id = public.auth_candidate_id()
    )
);
