import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dayKey } from "@/lib/elder-store";
import { todayStatus, type Status } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/family")({
  head: () => ({
    meta: [
      { title: "Family dashboard — FamilyCare" },
      { name: "description", content: "Today's medicine confirmations at a glance." },
      { property: "og:title", content: "Family dashboard — FamilyCare" },
      { property: "og:description", content: "Today's medicine confirmations at a glance." },
    ],
  }),
  component: Dashboard,
});

type Elder = { id: string; name: string; sharing_paused: boolean; last_active_at: string | null; last_checkin_date: string | null; paired_at: string | null };
type Med = { id: string; elder_id: string; name: string; time: string; pills_remaining: number };

const STATUS_STYLE: Record<Status, string> = {
  green: "border-success bg-success/10",
  yellow: "border-warning bg-warning/15",
  red: "border-destructive bg-destructive/10",
  paused: "border-border bg-muted",
};
const STATUS_LABEL: Record<Status, string> = { green: "All good", yellow: "Waiting for confirmation", red: "Needs attention", paused: "Paused by choice" };

function Dashboard() {
  const navigate = useNavigate();
  const [elders, setElders] = useState<Elder[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [events, setEvents] = useState<{ medicine_id: string }[]>([]);
  const [sos, setSos] = useState<{ id: string; elder_id: string; created_at: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [now, setNow] = useState(new Date());

  const load = useCallback(async () => {
    const day = dayKey(new Date());
    const [e, m, d, s] = await Promise.all([
      supabase.from("elders").select("id, name, sharing_paused, last_active_at, last_checkin_date, paired_at").order("created_at"),
      supabase.from("medicines").select("id, elder_id, name, time, pills_remaining"),
      supabase.from("dose_events").select("medicine_id").eq("day", day),
      supabase.from("sos_events").select("id, elder_id, created_at").eq("resolved", false),
    ]);
    setElders(e.data ?? []);
    setMeds(m.data ?? []);
    setEvents(d.data ?? []);
    setSos(s.data ?? []);
    setNow(new Date());
  }, []);

  // Live updates: reload whenever the elder confirms, checks in or presses SOS.
  useEffect(() => {
    void load();
    const ch = supabase
      .channel("family-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "dose_events" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "elders" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_events" }, () => void load())
      .subscribe();
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
  }, [load]);

  const addElder = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!newName.trim() || !u.user) return;
    const { data } = await supabase.from("elders").insert({ name: newName.trim(), owner_id: u.user.id }).select("id").single();
    setNewName("");
    if (data) navigate({ to: "/elder-setup/$id", params: { id: data.id } });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const confirmedIds = new Set(events.map((e) => e.medicine_id));
  const today = dayKey(now);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 bg-background p-5 text-foreground">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">FamilyCare</h1>
        <button onClick={signOut} className="rounded-md border px-3 py-2 text-sm">Sign out</button>
      </header>

      {elders.map((el) => {
        const list = meds.filter((m) => m.elder_id === el.id);
        const openSos = sos.filter((s) => s.elder_id === el.id);
        const st = todayStatus(list, confirmedIds, now, el.sharing_paused, openSos.length > 0);
        const low = list.filter((m) => m.pills_remaining <= 3);
        return (
          <section key={el.id} className={`rounded-2xl border-4 p-5 ${STATUS_STYLE[st.status]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{el.name}</h2>
                <p className="text-lg font-semibold">{STATUS_LABEL[st.status]}</p>
              </div>
              <Link to="/elder-setup/$id" params={{ id: el.id }} className="rounded-md border bg-card px-3 py-2 text-sm">Medicines & pairing</Link>
            </div>

            {openSos.map((s) => (
              <div key={s.id} className="mt-3 flex items-center justify-between rounded-xl bg-destructive p-3 font-bold text-destructive-foreground">
                SOS pressed at {new Date(s.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                <button className="rounded-md bg-card px-3 py-1 text-sm text-foreground" onClick={async () => { await supabase.from("sos_events").update({ resolved: true }).eq("id", s.id); void load(); }}>
                  I've handled it
                </button>
              </div>
            ))}

            {!el.paired_at ? (
              <p className="mt-2 text-muted-foreground">Elder's phone not paired yet.</p>
            ) : el.sharing_paused ? (
              <p className="mt-2 text-muted-foreground">Sharing is paused by choice. Nothing to worry about.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-base">
                <li><b>{st.confirmed} of {st.total}</b> doses confirmed today</li>
                <li>Last active: {el.last_active_at ? new Date(el.last_active_at).toLocaleString([], { hour: "numeric", minute: "2-digit", weekday: "short" }) : "—"}</li>
                <li>Daily check-in: {el.last_checkin_date === today ? "✓ Said they're okay" : "Not yet today"}</li>
                {st.notConfirmed.map((m) => <li key={m.id} className="font-semibold text-destructive">{m.name} ({m.time}) not confirmed</li>)}
              </ul>
            )}
            {low.map((m) => <p key={m.id} className="mt-2 rounded-lg bg-warning/20 p-2 text-sm font-semibold">Low stock: {m.name} — {m.pills_remaining} left</p>)}
          </section>
        );
      })}

      <section className="rounded-2xl border-2 border-dashed border-border p-5">
        <h2 className="text-xl font-bold">Add a parent</h2>
        <div className="mt-3 flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Aai / Mom" className="flex-1 rounded-lg border-2 border-input bg-card px-4 py-3" />
          <button onClick={addElder} className="rounded-lg bg-primary px-5 font-bold text-primary-foreground">Add</button>
        </div>
      </section>
    </main>
  );
}
