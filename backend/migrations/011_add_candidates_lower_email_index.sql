-- ============================================================
-- HireMind AI – Migration 011: Case-Insensitive Email Index
-- Enables fast case-insensitive lookups for candidates by lower(email).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_candidates_lower_email ON public.candidates (lower(email));
