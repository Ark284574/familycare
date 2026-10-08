CREATE TABLE public.elders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  pairing_code text NOT NULL UNIQUE DEFAULT lpad((floor(random()*1000000))::int::text, 6, '0'),
  device_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  paired_at timestamptz,
  sharing_paused boolean NOT NULL DEFAULT false,
  last_active_at timestamptz,
  last_checkin_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elders TO authenticated;
GRANT ALL ON public.elders TO service_role;
ALTER TABLE public.elders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family manages own elders" ON public.elders FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose text NOT NULL DEFAULT '',
  time text NOT NULL,
  note text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'var(--pill-white)',
  pills_remaining int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family manages own medicines" ON public.medicines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elders e WHERE e.id = elder_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.elders e WHERE e.id = elder_id AND e.owner_id = auth.uid()));

CREATE TABLE public.dose_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  day date NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medicine_id, day)
);
GRANT SELECT ON public.dose_events TO authenticated;
GRANT ALL ON public.dose_events TO service_role;
ALTER TABLE public.dose_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family reads own dose events" ON public.dose_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elders e WHERE e.id = elder_id AND e.owner_id = auth.uid()));

CREATE TABLE public.sos_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES public.elders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false
);
GRANT SELECT, UPDATE ON public.sos_events TO authenticated;
GRANT ALL ON public.sos_events TO service_role;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family reads own sos" ON public.sos_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elders e WHERE e.id = elder_id AND e.owner_id = auth.uid()));
CREATE POLICY "Family resolves own sos" ON public.sos_events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.elders e WHERE e.id = elder_id AND e.owner_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.elders, public.dose_events, public.sos_events;