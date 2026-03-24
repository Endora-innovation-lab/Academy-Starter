
-- Add batch_id column to attendance
ALTER TABLE public.attendance ADD COLUMN batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE;

-- Drop old unique constraint if exists (student_id, date)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_date_key;

-- Add new unique constraint (student_id, batch_id, date)
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_batch_date_unique UNIQUE (student_id, batch_id, date);

-- Add foreign key for attendance -> batches
-- (already added via REFERENCES above)

-- Add foreign key for attendance -> students  
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Add foreign key for attendance -> institutes
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_institute_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_institute_id_fkey FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE CASCADE;
