import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { PILL_COLORS, prettyTime } from "@/lib/elder-store";

export const Route = createFileRoute("/_authenticated/elder-setup/$id")({
  head: () => ({
    meta: [
      { title: "Medicines & pairing — FamilyCare" },
      { name: "description", content: "Add medicines and pair your parent's phone." },
      { property: "og:title", content: "Medicines & pairing — FamilyCare" },
      { property: "og:description", content: "Add medicines and pair your parent's phone." },
    ],
  }),
  component: ElderSetup,
});

type Med = { id: string; name: string; dose: string; time: string; note: string; color: string; pills_remaining: number };
const blank = { name: "", dose: "", time: "08:00", note: "", color: "var(--pill-white)", pills_remaining: 30 };

function ElderSetup() {
  const { id } = Route.useParams();
  const [elder, setElder] = useState<{ name: string; pairing_code: string; paired_at: string | null } | null>(null);
  const [meds, setMeds] = useState<Med[]>([]);
  const [form, setForm] = useState<typeof blank & { id?: string }>(blank);

  const load = useCallback(async () => {
    const [e, m] = await Promise.all([
      supabase.from("elders").select("name, pairing_code, paired_at").eq("id", id).maybeSingle(),
      supabase.from("medicines").select("id, name, dose, time, note, color, pills_remaining").eq("elder_id", id).order("time"),
    ]);
    setElder(e.data);
    setMeds(m.data ?? []);
  }, [id]);
  useEffect(() => void load(), [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id: medId, ...fields } = form;
    if (medId) await supabase.from("medicines").update(fields).eq("id", medId);
    else await supabase.from("medicines").insert({ ...fields, elder_id: id });
    setForm(blank);
    void load();
  };

  const remove = async (medId: string) => {
    await supabase.from("medicines").delete().eq("id", medId);
    void load();
  };

  if (!elder) return <main className="p-6">Loading…</main>;
  const pairUrl = `${window.location.origin}/pair?code=${elder.pairing_code}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-background p-5 text-foreground">
      <Link to="/family" className="text-sm underline">← Back to dashboard</Link>
      <h1 className="text-3xl font-bold">{elder.name}</h1>

      <section className="rounded-2xl border-2 border-border bg-card p-5">
        <h2 className="text-xl font-bold">Pair {elder.name}'s phone</h2>
        <p className="mt-1 text-muted-foreground">On their phone open FamilyCare → "I am the Elder" → "Pair with family", then type this code. Or scan the QR.</p>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <p className="font-mono text-5xl font-bold tracking-widest">{elder.pairing_code}</p>
          <div className="rounded-lg bg-card p-2"><QRCodeSVG value={pairUrl} size={140} /></div>
        </div>
        <p className="mt-3 text-sm font-semibold">{elder.paired_at ? `✓ Paired on ${new Date(elder.paired_at).toLocaleDateString()}` : "Not paired yet"}</p>
      </section>

      <section className="rounded-2xl border-2 border-border bg-card p-5">
        <h2 className="text-xl font-bold">Medicines</h2>
        <ul className="mt-3 divide-y divide-border">
          {meds.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full border-2 border-foreground" style={{ background: m.color }} />
                <div>
                  <p className="font-bold">{m.name} · {prettyTime(m.time)}</p>
                  <p className="text-sm text-muted-foreground">{m.dose} {m.note && `· ${m.note}`} · {m.pills_remaining} left</p>
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <button className="rounded-md border px-3 py-1" onClick={() => setForm(m)}>Edit</button>
                <button className="rounded-md border px-3 py-1 text-destructive" onClick={() => remove(m.id)}>Delete</button>
              </div>
            </li>
          ))}
          {!meds.length && <li className="py-3 text-muted-foreground">No medicines yet.</li>}
        </ul>

        <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
          <h3 className="font-bold sm:col-span-2">{form.id ? "Edit medicine" : "Add medicine"}</h3>
          <input required placeholder="Name (e.g. Metformin)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border-2 border-input bg-background px-3 py-2" />
          <input placeholder="Dose (e.g. 500 mg · 1 tablet)" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} className="rounded-lg border-2 border-input bg-background px-3 py-2" />
          <label className="flex flex-col text-sm">Time<input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="rounded-lg border-2 border-input bg-background px-3 py-2" /></label>
          <label className="flex flex-col text-sm">Pills remaining<input type="number" min={0} value={form.pills_remaining} onChange={(e) => setForm({ ...form, pills_remaining: Number(e.target.value) })} className="rounded-lg border-2 border-input bg-background px-3 py-2" /></label>
          <input placeholder="Note (e.g. After breakfast)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="rounded-lg border-2 border-input bg-background px-3 py-2" />
          <div className="flex items-center gap-2">
            {PILL_COLORS.map((c) => (
              <button type="button" key={c.value} aria-label={c.label} onClick={() => setForm({ ...form, color: c.value })}
                className={`h-9 w-9 rounded-full border-2 ${form.color === c.value ? "border-foreground ring-2 ring-ring" : "border-border"}`} style={{ background: c.value }} />
            ))}
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="rounded-lg bg-primary px-5 py-2 font-bold text-primary-foreground">{form.id ? "Save" : "Add"}</button>
            {form.id && <button type="button" onClick={() => setForm(blank)} className="rounded-lg border px-5 py-2">Cancel</button>}
          </div>
        </form>
      </section>
    </main>
  );
}
