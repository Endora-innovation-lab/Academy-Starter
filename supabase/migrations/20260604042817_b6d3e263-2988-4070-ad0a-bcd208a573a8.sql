
-- 1. Students overall status
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- 2. Fees: game + payment mode + excess
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS game_id uuid;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS payment_mode text;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS excess_amount numeric DEFAULT 0;

ALTER TABLE public.fee_history ADD COLUMN IF NOT EXISTS game_id uuid;
ALTER TABLE public.fee_history ADD COLUMN IF NOT EXISTS payment_mode text;
ALTER TABLE public.fee_history ADD COLUMN IF NOT EXISTS excess_amount numeric DEFAULT 0;

-- 3. student_games (per-student per-game enrollment + monthly fee)
CREATE TABLE IF NOT EXISTS public.student_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  game_id uuid NOT NULL,
  institute_id uuid NOT NULL,
  monthly_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, game_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_games TO authenticated;
GRANT ALL ON public.student_games TO service_role;

ALTER TABLE public.student_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage student_games"
  ON public.student_games FOR ALL
  USING (public.has_role(auth.uid(), 'admin') AND institute_id = public.get_user_institute_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND institute_id = public.get_user_institute_id(auth.uid()));

CREATE POLICY "Institute users can view student_games"
  ON public.student_games FOR SELECT
  USING (institute_id = public.get_user_institute_id(auth.uid()));

CREATE POLICY "Students can view own student_games"
  ON public.student_games FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_games.student_id AND s.user_id = auth.uid()));

-- Touch updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS student_games_updated ON public.student_games;
CREATE TRIGGER student_games_updated BEFORE UPDATE ON public.student_games
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
