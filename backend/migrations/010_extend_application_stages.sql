-- ============================================================
-- HireMind AI – Migration 010: Extend Application Stage Enum
-- Adds granular stage values used by the application pipeline state machine.
-- ============================================================

ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'shortlisted';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assignment_sent';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assignment_submitted';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'assignment_reviewed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'tech_round';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'tech_round_completed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'interview_round';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'interview_round_completed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'speaking_round';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'speaking_round_completed';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'hr_round';
ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'hr_round_completed';
