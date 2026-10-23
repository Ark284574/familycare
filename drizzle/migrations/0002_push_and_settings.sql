CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs" ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id uuid PRIMARY KEY,
  sos_alerts boolean NOT NULL DEFAULT true,
  dose_alerts boolean NOT NULL DEFAULT true,
  checkin_alerts boolean NOT NULL DEFAULT true,
  checkin_by text NOT NULL DEFAULT '11:00',
  quiet_enabled boolean NOT NULL DEFAULT false,
  quiet_start text NOT NULL DEFAULT '22:00',
  quiet_end text NOT NULL DEFAULT '07:00',
  sos_ignores_quiet boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.notification_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.alerts_sent (
  key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.alerts_sent TO service_role;
ALTER TABLE public.alerts_sent ENABLE ROW LEVEL SECURITY;