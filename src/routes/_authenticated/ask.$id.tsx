import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAboutElder } from "@/lib/family.functions";

export const Route = createFileRoute("/_authenticated/ask/$id")({
  head: () => ({
    meta: [
      { title: "Ask about medicines — FamilyCare" },
      { name: "description", content: "Ask questions about your parent's medicine and check-in history." },
      { property: "og:title", content: "Ask about medicines — FamilyCare" },
      { property: "og:description", content: "Ask questions about your parent's medicine and check-in history." },
    ],
  }),
  component: Ask,
});

const EXAMPLES = [
  "Which doses were not confirmed this week?",
  "Did they check in every day this week?",
  "Which medicine is running low?",
  "How often was the night dose confirmed in the last 30 days?",
];

function Ask() {
  const { id } = Route.useParams();
  const ask = useServerFn(askAboutElder);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ q: string; a?: string; err?: string }[]>([]);

  const send = async (question: string) => {
    if (question.trim().length < 3 || busy) return;
    setBusy(true);
    setQ("");
    setLog((l) => [...l, { q: question }]);
    try {
      const r = await ask({ data: { elderId: id, question } });
      setLog((l) => l.map((x, i) => (i === l.length - 1 ? (r.ok ? { ...x, a: r.answer } : { ...x, err: r.error }) : x)));
    } catch {
      setLog((l) => l.map((x, i) => (i === l.length - 1 ? { ...x, err: "Could not get an answer. Please try again." } : x)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 bg-background p-5 text-foreground">
      <Link to="/family" className="text-sm underline">← Back to dashboard</Link>
      <h1 className="text-3xl font-bold">Ask about medicines</h1>
      <p className="text-muted-foreground">Answers use only the last 30 days of confirmations, check-ins and SOS records. AI-powered — not medical advice.</p>

      {log.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => send(e)} className="rounded-full border bg-card px-3 py-2 text-sm">{e}</button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {log.map((x, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="self-end rounded-2xl bg-primary px-4 py-2 text-primary-foreground">{x.q}</p>
            {x.a ? <p className="whitespace-pre-wrap rounded-2xl border bg-card px-4 py-3">{x.a}</p>
              : x.err ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-destructive">{x.err}</p>
              : <p className="text-muted-foreground">Looking at the records…</p>}
          </div>
        ))}
      </div>

      <form className="sticky bottom-0 mt-auto flex gap-2 bg-background py-3" onSubmit={(e) => { e.preventDefault(); void send(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Type a question…" className="flex-1 rounded-lg border-2 border-input bg-card px-4 py-3" />
        <button disabled={busy} className="rounded-lg bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50">Ask</button>
      </form>
    </main>
  );
}
