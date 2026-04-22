-- Create teacher_attendance table for tracking teacher presence per batch per date
CREATE TABLE public.teacher_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  institute_id UUID NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'absent',
  marked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT teacher_attendance_status_check CHECK (status IN ('absent', 'present', 'late')),
  CONSTRAINT teacher_attendance_unique UNIQUE (teacher_id, batch_id, date)
);

-- Enable RLS
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Admins can manage all teacher_attendance in their institute
CREATE POLICY "Admins can manage teacher_attendance"
ON public.teacher_attendance
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND institute_id = get_user_institute_id(auth.uid()));

-- Teachers can manage their OWN attendance for batches they're assigned to
CREATE POLICY "Teachers can manage own attendance"
ON public.teacher_attendance
FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND institute_id = get_user_institute_id(auth.uid())
  AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_attendance.teacher_id AND t.user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND institute_id = get_user_institute_id(auth.uid())
  AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_attendance.teacher_id AND t.user_id = auth.uid())
);

-- Anyone in the same institute can view teacher_attendance
CREATE POLICY "Institute users can view teacher_attendance"
ON public.teacher_attendance
FOR SELECT
USING (institute_id = get_user_institute_id(auth.uid()));