ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS reg_prefix text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS game_prefix text;