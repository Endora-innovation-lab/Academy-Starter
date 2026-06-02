
-- Add notes column for payment note and create payment history table
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.fee_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_id uuid,
  student_id uuid NOT NULL,
  institute_id uuid NOT NULL,
  month text NOT NULL,
  amount numeric DEFAULT 0,
  collected_amount numeric DEFAULT 0,
  status text NOT NULL,
  notes text,
  updated_by uuid,
  updated_by_role text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.fee_history TO authenticated;
GRANT ALL ON public.fee_history TO service_role;

ALTER TABLE public.fee_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institute users can view fee_history"
  ON public.fee_history FOR SELECT
  USING (institute_id = get_user_institute_id(auth.uid()));

CREATE POLICY "Students can view own fee_history"
  ON public.fee_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = fee_history.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins can insert fee_history"
  ON public.fee_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND institute_id = get_user_institute_id(auth.uid()));

CREATE POLICY "Teachers can insert fee_history"
  ON public.fee_history FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND institute_id = get_user_institute_id(auth.uid()));
