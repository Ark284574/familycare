CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (elder_id, day)
);
GRANT SELECT ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family reads own elder checkins" ON public.checkins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elders e WHERE e.id = checkins.elder_id AND e.owner_id = auth.uid()));
INSERT INTO public.checkins (elder_id, day)
  SELECT id, last_checkin_date::date FROM public.elders WHERE last_checkin_date IS NOT NULL
  ON CONFLICT DO NOTHING;