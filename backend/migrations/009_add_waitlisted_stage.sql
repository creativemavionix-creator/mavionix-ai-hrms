-- ============================================================
-- HireMind AI – Supabase PostgreSQL Schema
-- Migration 009: Add 'waitlisted' stage to application_stage ENUM
-- ============================================================

ALTER TYPE application_stage ADD VALUE IF NOT EXISTS 'waitlisted';
