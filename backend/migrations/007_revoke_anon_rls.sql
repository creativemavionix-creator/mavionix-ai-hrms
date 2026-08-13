-- ============================================================
-- HireMind AI – Migration 007: Revoke Permissive Anon RLS Policies
-- Remediation for Audit Finding C-01
--
-- Revokes all permissive anonymous RLS policies created in 005_candidate_tokens.sql.
-- Candidate Portal authorization is now enforced through the FastAPI candidate-token
-- authentication layer (candidate_auth.py), while FastAPI uses the Supabase
-- service-role client for server-side database operations.
-- ============================================================

DROP POLICY IF EXISTS "anon_validate_token" ON public.candidate_tokens;
DROP POLICY IF EXISTS "anon_select_rounds_by_app" ON public.ai_interview_rounds;
DROP POLICY IF EXISTS "anon_insert_rounds" ON public.ai_interview_rounds;
DROP POLICY IF EXISTS "anon_update_rounds" ON public.ai_interview_rounds;
DROP POLICY IF EXISTS "anon_select_applications" ON public.applications;
DROP POLICY IF EXISTS "anon_select_candidates" ON public.candidates;
DROP POLICY IF EXISTS "anon_select_jobs" ON public.jobs;
DROP POLICY IF EXISTS "anon_update_applications" ON public.applications;
DROP POLICY IF EXISTS "anon_insert_activity_logs" ON public.activity_logs;
