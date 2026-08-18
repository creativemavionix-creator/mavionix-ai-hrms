-- ============================================================
-- HireMind AI – Migration 012: Add real user_id column to candidates table
-- Replaces JSONB-based auth linking with a real foreign key column to auth.users(id)
-- ============================================================

-- 1. Add user_id column referencing auth.users(id)
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index on candidates.user_id for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON public.candidates(user_id);

-- 3. Backfill user_id from parsed_data->>'user_id' JSONB field for existing records
UPDATE public.candidates
SET user_id = (parsed_data->>'user_id')::uuid
WHERE user_id IS NULL
  AND parsed_data IS NOT NULL
  AND (parsed_data->>'user_id') IS NOT NULL
  AND (parsed_data->>'user_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- 4. Backfill candidates whose email matches an existing auth.users record
UPDATE public.candidates c
SET user_id = au.id
FROM auth.users au
WHERE c.user_id IS NULL
  AND LOWER(c.email) = LOWER(au.email);

-- 5. Update auth_candidate_id helper function to use real user_id column
CREATE OR REPLACE FUNCTION public.auth_candidate_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT c.id
    FROM public.candidates c
    WHERE c.user_id = auth.uid();
$$;

-- 6. Update candidate_self_select RLS policy on public.candidates
DROP POLICY IF EXISTS "candidate_self_select" ON public.candidates;
CREATE POLICY "candidate_self_select"
ON public.candidates FOR SELECT
USING (user_id = auth.uid() OR id = public.auth_candidate_id());

-- 7. Update candidate_self_select_applications RLS policy on public.applications
DROP POLICY IF EXISTS "candidate_self_select_applications" ON public.applications;
CREATE POLICY "candidate_self_select_applications"
ON public.applications FOR SELECT
USING (
    candidate_id IN (
        SELECT id FROM public.candidates WHERE user_id = auth.uid()
    )
    OR candidate_id = public.auth_candidate_id()
);
