-- ── Supabase Realtime Publication & RLS Policy Fix ──────────────────────
-- Run this script in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/ukwmhwgchscvyvzsbcxk/sql)

-- 1. Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates, public.applications, public.ai_reports;

-- 2. Enable Row Level Security (RLS) on public tables
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS Policies for Candidates table
DROP POLICY IF EXISTS "Allow public select candidates" ON public.candidates;
CREATE POLICY "Allow public select candidates" ON public.candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert candidates" ON public.candidates;
CREATE POLICY "Allow public insert candidates" ON public.candidates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update candidates" ON public.candidates;
CREATE POLICY "Allow public update candidates" ON public.candidates FOR UPDATE USING (true);

-- 4. Add RLS Policies for Applications table
DROP POLICY IF EXISTS "Allow public select applications" ON public.applications;
CREATE POLICY "Allow public select applications" ON public.applications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert applications" ON public.applications;
CREATE POLICY "Allow public insert applications" ON public.applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update applications" ON public.applications;
CREATE POLICY "Allow public update applications" ON public.applications FOR UPDATE USING (true);

-- 5. Add RLS Policies for AI Reports table
DROP POLICY IF EXISTS "Allow public select ai_reports" ON public.ai_reports;
CREATE POLICY "Allow public select ai_reports" ON public.ai_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert ai_reports" ON public.ai_reports;
CREATE POLICY "Allow public insert ai_reports" ON public.ai_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update ai_reports" ON public.ai_reports;
CREATE POLICY "Allow public update ai_reports" ON public.ai_reports FOR UPDATE USING (true);
