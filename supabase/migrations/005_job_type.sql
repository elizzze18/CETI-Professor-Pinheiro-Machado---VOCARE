-- ============================================================
-- VOCARE — Migration 005: Expand job_type values
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Remove a constraint antiga e adiciona uma mais abrangente
ALTER TABLE job_listings
  DROP CONSTRAINT IF EXISTS job_listings_job_type_check;

ALTER TABLE job_listings
  ADD CONSTRAINT job_listings_job_type_check
  CHECK (job_type IN ('trainee','internship','job','apprentice','part_time','full_time','volunteer','freelance'));
