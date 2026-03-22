
-- Fix search_path for generate_institute_code
CREATE OR REPLACE FUNCTION public.generate_institute_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := 'INS' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.institutes WHERE code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;
