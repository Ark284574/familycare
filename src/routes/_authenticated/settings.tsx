import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS } from "@/lib/quiet-hours";
import { enableNotifications, notificationsSupported, pushSupported, subscribePush } from "@/lib/family-alerts";
import { sendTestPush } from "@/lib/family.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Alert settings — FamilyCare" },
      { name: "description", content: "Choose which FamilyCare alerts you get and set quiet hours." },
      { property: "og:title", content: "Alert settings — FamilyCare" },
      { property: "og:description", content: "Choose which FamilyCare alerts you get and set quiet hours." },
    ],
  }),
  component: Settings,
});

type S = typeof DEFAULT_SETTINGS;

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border bg-card p-4">
      <span>
        <span className="block text-lg font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      <input type="checkbox" className="mt-1 h-6 w-6 accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Settings() {
  const [s, setS] = useState<S>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState("");
  const [perm, setPerm] = useState<string>("default");
  const testPush = useServerFn(sendTestPush);

  useEffect(() => {
    setPerm(notificationsSupported() ? Notification.permission : "unsupported");
    void (async () => {
      const { data } = await supabase.from("notification_settings").select("*").maybeSingle();
      // Always use this phone's own time zone for quiet hours.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_SETTINGS.timezone;
      setS({ ...DEFAULT_SETTINGS, ...(data ?? {}), timezone: tz });
      if (Notification?.permission === "granted") void subscribePush().catch(() => {});
    })();
  }, []);

  const set = <K extends keyof S>(k: K, v: S[K]) => { setS((p) => ({ ...p, [k]: v })); setSaved(""); };

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("notification_settings").upsert({ ...s, user_id: u.user.id, updated_at: new Date().toISOString() });
    setSaved(error ? "Could not save. Please try again." : "Saved ✓");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 bg-background p-5 text-foreground">
      <Link to="/family" className="text-sm underline">← Back to dashboard</Link>
      <h1 className="text-3xl font-bold">Alert settings</h1>

      <section className="rounded-2xl border-2 p-4">
        <h2 className="text-xl font-bold">Alerts on this phone</h2>
        {!pushSupported() ? (
          <p className="mt-2 text-sm">This browser can't get alerts when closed. On iPhone, first add FamilyCare to your Home Screen, then open it from there.</p>
        ) : perm === "granted" ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p>✓ Alerts are on, even when FamilyCare is closed.</p>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={async () => { await subscribePush(); const r = await testPush(); setSaved(r.sent ? "Test alert sent ✓" : "No phone received it — try turning alerts on again."); }}>Send a test alert</button>
          </div>
        ) : perm === "denied" ? (
          <p className="mt-2 text-sm">Alerts are blocked. Allow notifications for this site in your browser settings.</p>
        ) : (
          <button className="mt-2 rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground" onClick={async () => setPerm(await enableNotifications())}>Turn on alerts on this phone</button>
        )}
      </section>

      <h2 className="mt-2 text-xl font-bold">Which alerts do you want?</h2>
      <Toggle label="SOS pressed" hint="Your parent held the SOS button." checked={s.sos_alerts} onChange={(v) => set("sos_alerts", v)} />
      <Toggle label="Dose not confirmed" hint="Still not confirmed 30 minutes after its time." checked={s.dose_alerts} onChange={(v) => set("dose_alerts", v)} />
      <Toggle label="No check-in today" hint="No “I'm okay” tap by the time below." checked={s.checkin_alerts} onChange={(v) => set("checkin_alerts", v)} />
      {s.checkin_alerts && (
        <label className="flex items-center justify-between rounded-xl border bg-card p-4">
          <span className="font-semibold">Check-in expected by</span>
          <input type="time" value={s.checkin_by} onChange={(e) => set("checkin_by", e.target.value)} className="rounded-md border px-2 py-1" />
        </label>
      )}

      <h2 className="mt-2 text-xl font-bold">Quiet hours</h2>
      <Toggle label="Use quiet hours" hint="No dose or check-in alerts during this time." checked={s.quiet_enabled} onChange={(v) => set("quiet_enabled", v)} />
      {s.quiet_enabled && (
        <>
          <div className="flex flex-wrap gap-4 rounded-xl border bg-card p-4">
            <label className="flex items-center gap-2">From <input type="time" value={s.quiet_start} onChange={(e) => set("quiet_start", e.target.value)} className="rounded-md border px-2 py-1" /></label>
            <label className="flex items-center gap-2">To <input type="time" value={s.quiet_end} onChange={(e) => set("quiet_end", e.target.value)} className="rounded-md border px-2 py-1" /></label>
          </div>
          <Toggle label="Let SOS through during quiet hours" hint="Strongly recommended." checked={s.sos_ignores_quiet} onChange={(v) => set("sos_ignores_quiet", v)} />
        </>
      )}
      <p className="text-sm text-muted-foreground">Time zone: {s.timezone}</p>

      <div className="flex items-center gap-3">
        <button onClick={save} className="rounded-lg bg-primary px-6 py-3 text-lg font-bold text-primary-foreground">Save</button>
        <span className="font-semibold">{saved}</span>
      </div>
    </main>
  );
}
