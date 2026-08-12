-- Tasks Table Migration for Supabase Postgres
-- Execute this script in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  requirements TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  assigned_by TEXT DEFAULT 'recruiter',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  submission_url TEXT,
  submission_text TEXT,
  submission_files JSONB,
  submitted_at TIMESTAMPTZ,
  review_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON public.tasks FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Enable insert access for all users'
  ) THEN
    CREATE POLICY "Enable insert access for all users" ON public.tasks FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Enable update access for all users'
  ) THEN
    CREATE POLICY "Enable update access for all users" ON public.tasks FOR UPDATE USING (true);
  END IF;
END $$;

-- Add tasks table to Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
