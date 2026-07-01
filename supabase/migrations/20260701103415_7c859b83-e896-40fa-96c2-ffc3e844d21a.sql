
-- ID generation settings on institutes (all nullable/defaulted for backward compat)
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS auto_teacher_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_student_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_batch_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_batch_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_game_id boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_game_id boolean NOT NULL DEFAULT false;

-- Teacher role (Teacher | Principal). Default 'teacher' preserves existing behavior.
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'teacher';

-- Backfill existing rows explicitly to be safe
UPDATE public.teachers SET role = 'teacher' WHERE role IS NULL;

-- Constrain to allowed values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teachers_role_check'
  ) THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_role_check CHECK (role IN ('teacher','principal'));
  END IF;
END $$;
