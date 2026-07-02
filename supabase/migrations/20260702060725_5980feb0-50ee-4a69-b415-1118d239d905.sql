
-- Add additive profile fields to students so full profile can be captured/updated
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS gender text;
