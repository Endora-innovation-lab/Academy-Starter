
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS teacher_id text;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS batch_id text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS game_id text;

-- Uniqueness scoped per institute (nulls allowed)
CREATE UNIQUE INDEX IF NOT EXISTS teachers_teacher_id_institute_uk
  ON public.teachers (institute_id, teacher_id) WHERE teacher_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS batches_batch_id_institute_uk
  ON public.batches (institute_id, batch_id) WHERE batch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS games_game_id_institute_uk
  ON public.games (institute_id, game_id) WHERE game_id IS NOT NULL;
