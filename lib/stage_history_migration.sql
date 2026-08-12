-- Canonical Stage History Audit Migration for Supabase Postgres
-- Execute this script in your Supabase SQL Editor

-- 1. Create stage_history audit log table
CREATE TABLE IF NOT EXISTS public.stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by TEXT DEFAULT 'system',
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stage_history' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON public.stage_history FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stage_history' AND policyname = 'Enable insert access for all users'
  ) THEN
    CREATE POLICY "Enable insert access for all users" ON public.stage_history FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 4. Automated Stage History Logger Trigger Function
CREATE OR REPLACE FUNCTION public.log_application_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.stage_history (application_id, from_stage, to_stage, changed_by, note)
    VALUES (NEW.id, NULL, NEW.stage, 'system', 'Initial application submitted');
  ELSIF (TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO public.stage_history (application_id, from_stage, to_stage, changed_by, note)
    VALUES (NEW.id, OLD.stage, NEW.stage, 'recruiter_action', 'Stage updated via canonical state machine');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger to public.applications
DROP TRIGGER IF EXISTS trigger_log_stage_change ON public.applications;

CREATE TRIGGER trigger_log_stage_change
AFTER INSERT OR UPDATE OF stage ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_stage_change();

-- 6. Add stage_history to Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_history;
