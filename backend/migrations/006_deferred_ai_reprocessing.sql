-- Migration 006: Add Deferred AI Reprocessing columns to ai_interview_rounds
ALTER TABLE public.ai_interview_rounds 
ADD COLUMN IF NOT EXISTS requires_ai_reprocessing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_review_completed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'verified',
ADD COLUMN IF NOT EXISTS evaluation_engine TEXT DEFAULT 'llm',
ADD COLUMN IF NOT EXISTS evaluation_model TEXT DEFAULT 'Gemini',
ADD COLUMN IF NOT EXISTS evaluation_version INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL;
