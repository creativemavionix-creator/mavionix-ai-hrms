-- ============================================================
-- HireMind AI – Supabase Row-Level Security
-- Migration 002: RLS policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ------------------------------------------------------------
-- Helper: fetch the role of the currently authenticated user.
-- Falls back to NULL (guest / unauthenticated).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role
    FROM public.users
    WHERE id = auth.uid();
$$;

-- Helper: returns TRUE for any HR-side staff role
CREATE OR REPLACE FUNCTION public.is_hr_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT current_user_role() IN ('super_admin', 'hr_manager', 'recruiter', 'interviewer');
$$;

-- Helper: returns the candidate.id linked to the authenticated user's email.
-- Returns NULL if the auth user is not a candidate.
CREATE OR REPLACE FUNCTION public.auth_candidate_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT c.id
    FROM public.candidates c
    JOIN auth.users au ON au.email = c.email
    WHERE au.id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Enable RLS on all tables
-- ------------------------------------------------------------
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE: users
-- ============================================================

-- HR staff see all user profiles
CREATE POLICY "hr_staff_select_users"
ON public.users FOR SELECT
USING (public.is_hr_staff());

-- Each user can read their own row
CREATE POLICY "self_select_user"
ON public.users FOR SELECT
USING (id = auth.uid());

-- Only super_admin can insert / update / delete users
CREATE POLICY "super_admin_manage_users"
ON public.users FOR ALL
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');

-- ============================================================
-- TABLE: jobs
-- ============================================================

-- HR staff: full read access
CREATE POLICY "hr_staff_select_jobs"
ON public.jobs FOR SELECT
USING (public.is_hr_staff());

-- Candidates: can see only active jobs
CREATE POLICY "candidates_select_active_jobs"
ON public.jobs FOR SELECT
USING (
    public.current_user_role() = 'candidate'
    AND status = 'active'
);

-- HR managers / super_admin: write access
CREATE POLICY "hr_manager_write_jobs"
ON public.jobs FOR INSERT
WITH CHECK (public.current_user_role() IN ('super_admin', 'hr_manager'));

CREATE POLICY "hr_manager_update_jobs"
ON public.jobs FOR UPDATE
USING (public.current_user_role() IN ('super_admin', 'hr_manager'));

CREATE POLICY "hr_manager_delete_jobs"
ON public.jobs FOR DELETE
USING (public.current_user_role() IN ('super_admin', 'hr_manager'));

-- ============================================================
-- TABLE: candidates
-- ============================================================

-- HR staff: see all candidates
CREATE POLICY "hr_staff_select_candidates"
ON public.candidates FOR SELECT
USING (public.is_hr_staff());

-- Candidates: see only their own record
CREATE POLICY "candidate_self_select"
ON public.candidates FOR SELECT
USING (id = public.auth_candidate_id());

-- HR staff: insert / update
CREATE POLICY "hr_staff_write_candidates"
ON public.candidates FOR INSERT
WITH CHECK (public.is_hr_staff());

CREATE POLICY "hr_staff_update_candidates"
ON public.candidates FOR UPDATE
USING (public.is_hr_staff());

-- ============================================================
-- TABLE: applications
-- ============================================================

-- HR staff: full access
CREATE POLICY "hr_staff_select_applications"
ON public.applications FOR SELECT
USING (public.is_hr_staff());

-- Candidates: see only their own applications
CREATE POLICY "candidate_self_select_applications"
ON public.applications FOR SELECT
USING (candidate_id = public.auth_candidate_id());

-- HR staff: write
CREATE POLICY "hr_staff_write_applications"
ON public.applications FOR INSERT
WITH CHECK (public.is_hr_staff());

CREATE POLICY "hr_staff_update_applications"
ON public.applications FOR UPDATE
USING (public.is_hr_staff());

-- ============================================================
-- TABLE: ai_reports
-- ============================================================

-- HR staff: full access
CREATE POLICY "hr_staff_select_ai_reports"
ON public.ai_reports FOR SELECT
USING (public.is_hr_staff());

-- Candidates: see their own report (via applications join)
CREATE POLICY "candidate_self_select_ai_reports"
ON public.ai_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = ai_reports.application_id
          AND a.candidate_id = public.auth_candidate_id()
    )
);

-- HR staff: write
CREATE POLICY "hr_staff_write_ai_reports"
ON public.ai_reports FOR INSERT
WITH CHECK (public.is_hr_staff());

CREATE POLICY "hr_staff_update_ai_reports"
ON public.ai_reports FOR UPDATE
USING (public.is_hr_staff());

-- ============================================================
-- TABLE: interviews
-- ============================================================

-- HR staff and interviewers: full read
CREATE POLICY "hr_staff_select_interviews"
ON public.interviews FOR SELECT
USING (public.is_hr_staff());

-- Candidates: see interviews linked to their own applications
CREATE POLICY "candidate_self_select_interviews"
ON public.interviews FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = interviews.application_id
          AND a.candidate_id = public.auth_candidate_id()
    )
);

-- HR staff: write
CREATE POLICY "hr_staff_write_interviews"
ON public.interviews FOR INSERT
WITH CHECK (public.is_hr_staff());

CREATE POLICY "hr_staff_update_interviews"
ON public.interviews FOR UPDATE
USING (public.is_hr_staff());

-- ============================================================
-- TABLE: communication_channels
-- ============================================================

-- HR staff: full access
CREATE POLICY "hr_staff_all_channels"
ON public.communication_channels FOR ALL
USING (public.is_hr_staff())
WITH CHECK (public.is_hr_staff());

-- ============================================================
-- TABLE: messages
-- ============================================================

-- HR staff: full access
CREATE POLICY "hr_staff_all_messages"
ON public.messages FOR ALL
USING (public.is_hr_staff())
WITH CHECK (public.is_hr_staff());

-- Candidates: read their own messages
CREATE POLICY "candidate_self_select_messages"
ON public.messages FOR SELECT
USING (candidate_id = public.auth_candidate_id());

-- ============================================================
-- TABLE: activity_logs
-- ============================================================

-- HR staff: full read
CREATE POLICY "hr_staff_select_activity_logs"
ON public.activity_logs FOR SELECT
USING (public.is_hr_staff());

-- All authenticated users can insert (append-only)
CREATE POLICY "authenticated_insert_activity_logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TABLE: settings
-- ============================================================

-- HR staff: full read
CREATE POLICY "hr_staff_select_settings"
ON public.settings FOR SELECT
USING (public.is_hr_staff());

-- Only super_admin can write settings
CREATE POLICY "super_admin_write_settings"
ON public.settings FOR ALL
USING (public.current_user_role() = 'super_admin')
WITH CHECK (public.current_user_role() = 'super_admin');
