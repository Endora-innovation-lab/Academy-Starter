-- 1. Optimistic-lock version column on fees
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 2. Trigger: bump version on every update
CREATE OR REPLACE FUNCTION public.tg_bump_fee_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fees_bump_version ON public.fees;
CREATE TRIGGER fees_bump_version
BEFORE UPDATE ON public.fees
FOR EACH ROW EXECUTE FUNCTION public.tg_bump_fee_version();

REVOKE EXECUTE ON FUNCTION public.tg_bump_fee_version() FROM PUBLIC, anon, authenticated;

-- 3. Guarded update: first committed write wins, stale writes rejected
CREATE OR REPLACE FUNCTION public.update_fee_guarded(
  _fee_id uuid,
  _expected_version integer,
  _amount numeric,
  _collected_amount numeric,
  _excess_amount numeric,
  _status text,
  _payment_mode text,
  _notes text,
  _updated_by uuid,
  _game_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.fees
  SET amount = _amount,
      collected_amount = _collected_amount,
      excess_amount = _excess_amount,
      status = _status,
      payment_mode = _payment_mode,
      notes = _notes,
      updated_by = _updated_by,
      game_id = _game_id
  WHERE id = _fee_id
    AND version = _expected_version;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'This fee has already been updated. Please refresh and try again.'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_fee_guarded(uuid, integer, numeric, numeric, numeric, text, text, text, uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_fee_guarded(uuid, integer, numeric, numeric, numeric, text, text, text, uuid, uuid) FROM PUBLIC, anon;