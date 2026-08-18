-- 013_assignment_deliverables.sql
-- Migration: Add configurable deliverables_required and structured submission_data to public.assignments

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS deliverables_required TEXT[] DEFAULT ARRAY['github_link', 'report']::TEXT[],
ADD COLUMN IF NOT EXISTS submission_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.assignments.deliverables_required IS 'List of requested deliverable keys: github_link, deployment_link, report';
COMMENT ON COLUMN public.assignments.submission_data IS 'Candidate submitted deliverables mapping key -> value';
