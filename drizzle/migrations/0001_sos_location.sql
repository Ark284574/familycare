ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.sos_events ADD COLUMN IF NOT EXISTS accuracy_m double precision;