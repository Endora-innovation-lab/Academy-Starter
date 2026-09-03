-- 1. Remove self-insert privilege escalation on user_roles
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- 2. One role row per user
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique ON public.user_roles (user_id);

-- 3. Deterministic institute resolution
CREATE OR REPLACE FUNCTION public.get_user_institute_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT institute_id
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY id ASC
  LIMIT 1
$function$;

-- 4. Safe, authorized way for an institute owner to receive the admin role
CREATE OR REPLACE FUNCTION public.claim_institute_admin(_institute_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.institutes
    WHERE id = _institute_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not authorized for this institute';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role, institute_id)
  VALUES (v_uid, 'admin', _institute_id);
END;
$function$;

-- 5. Restrict execution of SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION public.claim_institute_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_institute_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_institute_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_institute_code() TO service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_institute_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_institute_id(uuid) TO authenticated, service_role;