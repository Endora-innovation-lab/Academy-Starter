-- Private schema for internal helpers (not exposed via the API)
CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

-- Move RLS helper functions out of the API-exposed public schema.
-- Existing policies reference them by OID, so they continue to work.
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA app_private;
ALTER FUNCTION public.get_user_institute_id(uuid) SET SCHEMA app_private;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION app_private.get_user_institute_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.get_user_institute_id(uuid) TO authenticated, service_role;

-- Replace the callable admin-claim RPC with a trigger so no public RPC is exposed.
DROP FUNCTION IF EXISTS public.claim_institute_admin(uuid);

CREATE OR REPLACE FUNCTION app_private.grant_institute_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role, institute_id)
  VALUES (NEW.user_id, 'admin', NEW.id);

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION app_private.grant_institute_owner_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS institutes_grant_owner_admin ON public.institutes;
CREATE TRIGGER institutes_grant_owner_admin
AFTER INSERT ON public.institutes
FOR EACH ROW EXECUTE FUNCTION app_private.grant_institute_owner_admin();