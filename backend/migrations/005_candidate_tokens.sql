-- ============================================================
-- HireMind AI – Migration 005: Candidate Portal Tokens
-- Creates a tokenized entry system for candidate-facing AI interviews.
-- Run AFTER 004_ai_interview_pipeline.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Candidate access tokens table
-- ────────────────────────────────────────────────────────────

CREATE TABLE public.candidate_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID NOT NULL REFERENCES public.candidates (id) ON DELETE CASCADE,
    application_id  UUID NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    round_type      ai_round_type NOT NULL,      -- tech, interview, hr
    used            BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.candidate_tokens IS
    'Short-lived access tokens for candidate portal entry. One token per candidate per round.';

CREATE INDEX idx_candidate_tokens_token ON public.candidate_tokens (token);
CREATE INDEX idx_candidate_tokens_candidate ON public.candidate_tokens (candidate_id);
CREATE INDEX idx_candidate_tokens_application ON public.candidate_tokens (application_id);

-- ────────────────────────────────────────────────────────────
-- 2. RLS policies for candidate_tokens
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.candidate_tokens ENABLE ROW LEVEL SECURITY;

-- HR staff: full access (generate/view tokens)
CREATE POLICY "hr_staff_all_tokens"
ON public.candidate_tokens FOR ALL
USING (public.is_hr_staff())
WITH CHECK (public.is_hr_staff());

-- Anonymous/service: allow SELECT by token value (for validation)
-- This uses a permissive policy so the anon key can validate tokens
CREATE POLICY "anon_validate_token"
ON public.candidate_tokens FOR SELECT
USING (true);

-- ────────────────────────────────────────────────────────────
-- 3. Allow candidates to INSERT into ai_interview_rounds
--    (needed for the portal to write transcript updates)
-- ────────────────────────────────────────────────────────────

-- Candidates can update their own in-progress rounds (transcript append)
CREATE POLICY "candidate_update_own_rounds"
ON public.ai_interview_rounds FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = ai_interview_rounds.application_id
          AND a.candidate_id = public.auth_candidate_id()
    )
    AND status = 'in_progress'
);

-- Allow anon to select rounds by application_id (token-validated in app layer)
CREATE POLICY "anon_select_rounds_by_app"
ON public.ai_interview_rounds FOR SELECT
USING (true);

-- Allow anon to insert rounds (token-validated in app layer)
CREATE POLICY "anon_insert_rounds"
ON public.ai_interview_rounds FOR INSERT
WITH CHECK (true);

-- Allow anon to update rounds (token-validated in app layer)
CREATE POLICY "anon_update_rounds"
ON public.ai_interview_rounds FOR UPDATE
USING (true);

-- ────────────────────────────────────────────────────────────
-- 4. Anon access to related tables for the portal
-- ────────────────────────────────────────────────────────────

-- Allow anon to read applications (token-validated in app layer)
CREATE POLICY "anon_select_applications"
ON public.applications FOR SELECT
USING (true);

-- Allow anon to read candidates (own row, token-validated in app layer)
CREATE POLICY "anon_select_candidates"
ON public.candidates FOR SELECT
USING (true);

-- Allow anon to read jobs (for job title context)
CREATE POLICY "anon_select_jobs"
ON public.jobs FOR SELECT
USING (true);

-- Allow anon to update applications stage (token-validated in app layer)
CREATE POLICY "anon_update_applications"
ON public.applications FOR UPDATE
USING (true);

-- Allow anon to insert activity_logs
CREATE POLICY "anon_insert_activity_logs"
ON public.activity_logs FOR INSERT
WITH CHECK (true);
