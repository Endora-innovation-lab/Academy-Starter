
-- 1. Institutes profile + attendance settings fields
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS institute_type text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS established_year integer,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS branch_count integer,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'beta',
  ADD COLUMN IF NOT EXISTS attendance_window_minutes integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS attendance_auto_absent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_automation_enabled boolean NOT NULL DEFAULT true;

-- 2. Teachers profile additions
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS blood_group text;

-- 3. Students profile additions (most fields already exist)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS emergency_contact text;

-- 4. Expand attendance status to allow 'late' and 'pending' (additive, existing rows valid)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status = ANY (ARRAY['present','absent','late','pending']));

ALTER TABLE public.teacher_attendance DROP CONSTRAINT IF EXISTS teacher_attendance_status_check;
ALTER TABLE public.teacher_attendance
  ADD CONSTRAINT teacher_attendance_status_check
  CHECK (status = ANY (ARRAY['present','absent','late','pending']));

-- 5. Temporary rolling attendance sessions
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  window_minutes integer NOT NULL DEFAULT 180,
  triggered_by uuid REFERENCES auth.users(id),
  triggered_by_teacher_id uuid REFERENCES public.teachers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, session_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institute users can view sessions"
  ON public.attendance_sessions FOR SELECT
  USING (institute_id = public.get_user_institute_id(auth.uid()));

CREATE POLICY "Admins can manage sessions"
  ON public.attendance_sessions FOR ALL
  USING (public.has_role(auth.uid(),'admin') AND institute_id = public.get_user_institute_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND institute_id = public.get_user_institute_id(auth.uid()));

CREATE POLICY "Teachers can manage sessions"
  ON public.attendance_sessions FOR ALL
  USING (public.has_role(auth.uid(),'teacher') AND institute_id = public.get_user_institute_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'teacher') AND institute_id = public.get_user_institute_id(auth.uid()));
