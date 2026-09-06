ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_student_id_month_key;
CREATE UNIQUE INDEX IF NOT EXISTS fees_student_month_game_uniq
  ON public.fees (student_id, month, COALESCE(game_id, '00000000-0000-0000-0000-000000000000'::uuid));