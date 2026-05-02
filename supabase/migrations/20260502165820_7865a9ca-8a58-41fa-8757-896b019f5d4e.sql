CREATE POLICY "Teachers can view fees"
ON public.fees
FOR SELECT
USING (has_role(auth.uid(), 'teacher'::app_role) AND institute_id = get_user_institute_id(auth.uid()));

CREATE POLICY "Teachers can update fees"
ON public.fees
FOR UPDATE
USING (has_role(auth.uid(), 'teacher'::app_role) AND institute_id = get_user_institute_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND institute_id = get_user_institute_id(auth.uid()));

CREATE POLICY "Teachers can insert fees"
ON public.fees
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND institute_id = get_user_institute_id(auth.uid()));