
-- Allow users to insert their own role (needed during institute registration)
CREATE POLICY "Users can insert own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Backfill: insert admin role for existing institute user who is missing it
INSERT INTO public.user_roles (user_id, role, institute_id)
SELECT i.user_id, 'admin'::app_role, i.id
FROM public.institutes i
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = i.user_id
);

-- Also add UPDATE policy on profiles so admin-operations can update profiles
CREATE POLICY "Admins can update profiles in institute"
ON public.profiles
FOR UPDATE
TO authenticated
USING (institute_id = get_user_institute_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));
