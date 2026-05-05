-- Add ON DELETE CASCADE foreign keys (skip ones that already exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='batch_teachers_teacher_id_fkey') THEN
    ALTER TABLE public.batch_teachers ADD CONSTRAINT batch_teachers_teacher_id_fkey
      FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='attendance_student_id_fkey') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='attendance_batch_id_fkey') THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fees_student_id_fkey') THEN
    ALTER TABLE public.fees ADD CONSTRAINT fees_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='teacher_attendance_teacher_id_fkey') THEN
    ALTER TABLE public.teacher_attendance ADD CONSTRAINT teacher_attendance_teacher_id_fkey
      FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='teacher_attendance_batch_id_fkey') THEN
    ALTER TABLE public.teacher_attendance ADD CONSTRAINT teacher_attendance_batch_id_fkey
      FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;
  END IF;
END $$;