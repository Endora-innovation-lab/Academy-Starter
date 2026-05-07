-- Create games/courses table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institute_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage games"
ON public.games
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND institute_id = get_user_institute_id(auth.uid()));

CREATE POLICY "Institute users can view games"
ON public.games
FOR SELECT
USING (institute_id = get_user_institute_id(auth.uid()));

-- Add game_id to batches (nullable for backwards compatibility)
ALTER TABLE public.batches ADD COLUMN game_id UUID;

CREATE INDEX idx_batches_game_id ON public.batches(game_id);
CREATE INDEX idx_games_institute_id ON public.games(institute_id);