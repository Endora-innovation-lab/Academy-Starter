
-- Junction table for multiple teachers per batch
CREATE TABLE IF NOT EXISTS public.batch_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  UNIQUE(batch_id, teacher_id)
);

ALTER TABLE public.batch_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage batch_teachers" ON public.batch_teachers
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM batches b WHERE b.id = batch_teachers.batch_id 
    AND b.institute_id = get_user_institute_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  ));

CREATE POLICY "Institute users can view batch_teachers" ON public.batch_teachers
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM batches b WHERE b.id = batch_teachers.batch_id 
    AND b.institute_id = get_user_institute_id(auth.uid())
  ));

-- Unique constraints for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_date_unique ON public.attendance(student_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS fees_student_month_unique ON public.fees(student_id, month);
