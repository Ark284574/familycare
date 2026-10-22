import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sun, CloudSun, Moon, Check, ShieldCheck, Heart } from "lucide-react";
import {
  SAMPLE_MEDICINES,
  type Medicine,
  type Slot,
  emptyDemo,
  loadDemo,
  saveDemo,
  getDeviceToken,
  setDeviceToken,
  slotOf,
  dayKey,
  toMin,
  prettyTime,
} from "@/lib/elder-store";
import { getElderToday, confirmDose, checkIn, sendSos, setSharingPaused } from "@/lib/elder.functions";
import { speak, chime } from "@/lib/speech";

export const Route = createFileRoute("/elder")({
  head: () => ({
    meta: [
      { title: "Elder Mode — FamilyCare" },
      { name: "description", content: "Big, simple medicine reminders with one I TOOK IT button." },
      { property: "og:title", content: "Elder Mode — FamilyCare" },
      { property: "og:description", content: "Big, simple medicine reminders with one I TOOK IT button." },
    ],
  }),
  component: ElderScreen,
});

const SLOT_ICON: Record<Slot, typeof Sun> = { Morning: Sun, Afternoon: CloudSun, Night: Moon };

// Everything the screen needs, whether it comes from the cloud or the demo.
type Today = { name: string | null; meds: Medicine[]; confirmed: Record<string, string>; checkedIn: boolean; paused: boolean };

function ElderScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [today, setToday] = useState<Today>({ name: null, meds: [], confirmed: {}, checkedIn: false, paused: false });
  const [now, setNow] = useState(() => new Date());
  const [offset, setOffset] = useState(0); // demo only: shifts the clock forward (minutes)
  const [view, setView] = useState<"home" | "privacy">("home");
  const [sosSent, setSosSent] = useState(false);
  const [sosLocated, setSosLocated] = useState(false);
  const spokenRef = useRef<Record<string, number>>({});

  const clock = new Date(now.getTime() + offset * 60000);
  const day = dayKey(clock);
  const nowMin = clock.getHours() * 60 + clock.getMinutes();

  // Load data: from the cloud if paired, otherwise the on-phone demo.
  const refresh = useCallback(async () => {
    const t = getDeviceToken();
    setToken(t);
    if (t) {
      try {
        const r = await getElderToday({ data: { deviceToken: t, day } });
        setToday({ name: r.name, meds: r.medicines, confirmed: r.confirmed, checkedIn: r.checkedIn, paused: r.paused });
      } catch {
        setDeviceToken(null); // pairing was removed by family
        setToken(null);
      }
    } else {
      const d = loadDemo();
      const confirmed = Object.fromEntries(
        Object.entries(d.confirmed).filter(([k]) => k.startsWith(day)).map(([k, v]) => [k.slice(11), v]),
      );
      setToday({ name: null, meds: SAMPLE_MEDICINES, confirmed, checkedIn: d.lastCheckin === day, paused: d.paused });
    }
  }, [day]);

  useEffect(() => void refresh(), [refresh]);

  // Tick every 15 s; re-sync with the cloud every minute (picks up family edits).
  useEffect(() => {
    const a = setInterval(() => setNow(new Date()), 15000);
    const b = setInterval(() => void refresh(), 60000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refresh]);

  // Keep the screen awake so spoken reminders can play.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release();
  }, []);

  const meds = [...today.meds].sort((a, b) => toMin(a.time) - toMin(b.time));
  const isDone = (id: string) => Boolean(today.confirmed[id]);
  const current = meds.find((m) => !isDone(m.id));
  const due = current ? nowMin >= toMin(current.time) : false;

  // Escalating reminders: at dose time, after 10 min, louder after 20 min.
  useEffect(() => {
    if (!current || !due) return;
    const late = nowMin - toMin(current.time);
    const stage = late >= 20 ? 3 : late >= 10 ? 2 : 1;
    const key = `${day}_${current.id}`;
    if ((spokenRef.current[key] ?? 0) >= stage) return;
    spokenRef.current[key] = stage;
    if (stage === 3) chime();
    speak(`${stage > 1 ? "Reminder. " : ""}It is time for your ${current.name}. ${current.dose}. Press the green button when you have taken it.`, stage === 3);
  }, [current, due, nowMin, day]);

  const confirm = async () => {
    if (!current || isDone(current.id)) return; // locked: cannot confirm twice
    const med = current;
    // Show it immediately, then save.
    setToday((t) => ({ ...t, confirmed: { ...t.confirmed, [med.id]: new Date().toISOString() } }));
    const next = meds.find((m) => m.id !== med.id && !isDone(m.id));
    speak(next ? `Done. Next medicine at ${prettyTime(next.time)}.` : "Done. All medicines taken for today.");
    if (token) await confirmDose({ data: { deviceToken: token, day, medicineId: med.id } });
    else { const d = loadDemo(); saveDemo({ ...d, confirmed: { ...d.confirmed, [`${day}_${med.id}`]: new Date().toISOString() } }); }
  };

  const doCheckIn = async () => {
    setToday((t) => ({ ...t, checkedIn: true }));
    speak("Thank you. Your family knows you are okay.");
    if (token) await checkIn({ data: { deviceToken: token, day } });
    else saveDemo({ ...loadDemo(), lastCheckin: day });
  };

  const togglePause = async () => {
    const paused = !today.paused;
    setToday((t) => ({ ...t, paused }));
    if (token) await setSharingPaused({ data: { deviceToken: token, paused } });
    else saveDemo({ ...loadDemo(), paused });
  };

  const lastDone = [...meds].reverse().find((m) => isDone(m.id));

  if (view === "privacy") return <PrivacyView paused={today.paused} onToggle={togglePause} onBack={() => setView("home")} />;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 bg-background p-5 text-foreground">
      <header className="flex items-center justify-between">
        <p className="text-elder-md font-bold">{clock.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
        <p className="text-elder-sm text-muted-foreground">{clock.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p>
      </header>
      {today.name && <p className="text-elder-md font-bold">Hello, {today.name}</p>}

      <section className="grid grid-cols-3 gap-3">
        {(["Morning", "Afternoon", "Night"] as Slot[]).map((slot) => {
          const Icon = SLOT_ICON[slot];
          const list = meds.filter((m) => slotOf(m.time) === slot);
          const allDone = list.length > 0 && list.every((m) => isDone(m.id));
          return (
            <div key={slot} className={`flex flex-col items-center rounded-2xl border-4 p-3 ${allDone ? "border-success bg-success/15" : "border-border bg-card"}`}>
              <Icon className="h-12 w-12" strokeWidth={2.5} />
              <span className="mt-1 text-elder-xs font-bold">{slot}</span>
              {allDone && <Check className="h-8 w-8 text-success" strokeWidth={4} />}
            </div>
          );
        })}
      </section>

      {current ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-4 border-foreground bg-card p-6 text-center">
          <p className="text-elder-sm font-bold uppercase tracking-wide text-muted-foreground">
            {due ? "Time for your medicine" : `Next medicine at ${prettyTime(current.time)}`}
          </p>
          <Pill color={current.color} />
          <h1 className="text-elder-xl font-extrabold leading-tight">{current.name}</h1>
          <p className="text-elder-md">{current.dose}</p>
          {current.note && <p className="text-elder-sm text-muted-foreground">{current.note}</p>}
          <button onClick={confirm} className="mt-2 w-full rounded-3xl bg-success py-8 text-elder-xl font-extrabold text-success-foreground shadow-lg active:scale-95">
            I TOOK IT
          </button>
        </section>
      ) : meds.length ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border-4 border-success bg-success/15 p-8 text-center">
          <Check className="h-20 w-20 text-success" strokeWidth={4} />
          <h1 className="text-elder-lg font-extrabold">All done for today</h1>
        </section>
      ) : (
        <p className="rounded-3xl border-4 border-border p-8 text-center text-elder-md">No medicines yet. Your family will add them.</p>
      )}

      {lastDone && current && (
        <p className="rounded-2xl bg-muted p-4 text-center text-elder-sm font-semibold">
          ✓ {lastDone.name} done. Next medicine at {prettyTime(current.time)}.
        </p>
      )}

      <button
        disabled={today.checkedIn}
        onClick={doCheckIn}
        className={`flex items-center justify-center gap-3 rounded-3xl border-4 py-6 text-elder-lg font-bold ${today.checkedIn ? "border-success bg-success/15" : "border-primary bg-primary text-primary-foreground"}`}
      >
        <Heart className="h-10 w-10" strokeWidth={3} />
        {today.checkedIn ? "You said you're okay today" : "I'm okay today"}
      </button>

      <SosButton
        sent={sosSent}
        located={sosLocated}
        onSend={() => {
          setSosSent(true);
          setSosLocated(false);
          speak("Help is on the way. Your family has been alerted.");
          // Ask for location once, only now. Never wait more than 8 s; send anyway.
          let done = false;
          const send = (c?: GeolocationCoordinates) => {
            if (done) return;
            done = true;
            if (c) setSosLocated(true);
            if (token) void sendSos({ data: { deviceToken: token, ...(c ? { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy } : {}) } });
          };
          const fallback = window.setTimeout(() => send(), 8500);
          if (!navigator.geolocation) { clearTimeout(fallback); send(); return; }
          navigator.geolocation.getCurrentPosition(
            (p) => { clearTimeout(fallback); send(p.coords); },
            () => { clearTimeout(fallback); send(); },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
          );
        }}
        onReset={() => { setSosSent(false); setSosLocated(false); }}
      />

      <button onClick={() => setView("privacy")} className="flex items-center justify-center gap-3 rounded-2xl border-2 border-border py-4 text-elder-sm font-semibold">
        <ShieldCheck className="h-8 w-8" /> What my family can see {today.paused && "· Paused"}
      </button>

      <footer className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="w-full font-semibold">{token ? "Paired with family" : "Demo mode (sample medicines)"}</span>
        <button className="rounded-md border px-3 py-2" onClick={() => {
          if (!current) return;
          const real = new Date();
          spokenRef.current = {};
          setOffset(toMin(current.time) - (real.getHours() * 60 + real.getMinutes()));
        }}>Jump to dose time</button>
        <button className="rounded-md border px-3 py-2" onClick={() => setOffset(offset + 10)}>+10 min</button>
        {!token && <button className="rounded-md border px-3 py-2" onClick={() => { spokenRef.current = {}; saveDemo(emptyDemo); setOffset(0); void refresh(); }}>Reset day</button>}
        {token
          ? <button className="rounded-md border px-3 py-2" onClick={() => { setDeviceToken(null); void refresh(); }}>Unpair this phone</button>
          : <Link to="/pair" className="rounded-md border px-3 py-2">Pair with family</Link>}
        <Link to="/" className="rounded-md border px-3 py-2">Home</Link>
      </footer>
    </main>
  );
}

function Pill({ color }: { color: string }) {
  return (
    <div className="flex h-24 w-48 overflow-hidden rounded-full border-4 border-foreground shadow-md" aria-hidden>
      <div className="h-full w-1/2" style={{ background: color }} />
      <div className="h-full w-1/2 bg-card" />
    </div>
  );
}

// SOS needs a 3-second hold so it is not pressed by accident.
function SosButton({ sent, onSend, onReset }: { sent: boolean; onSend: () => void; onReset: () => void }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  };
  const start = () => {
    const t0 = Date.now();
    timer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 3000);
      setProgress(p);
      if (p >= 1) { stop(); onSend(); }
    }, 50);
  };

  if (sent) {
    return (
      <div className="rounded-3xl border-4 border-destructive bg-destructive/10 p-6 text-center">
        <p className="text-elder-lg font-extrabold text-destructive">Family alerted</p>
        <p className="text-elder-sm">Help is on the way.</p>
        <button onClick={onReset} className="mt-3 rounded-xl border-2 px-5 py-3 text-elder-sm font-semibold">I'm fine now</button>
      </div>
    );
  }
  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative select-none overflow-hidden rounded-3xl bg-destructive py-6 text-elder-lg font-extrabold text-destructive-foreground"
    >
      <span className="absolute inset-y-0 left-0 bg-foreground/30" style={{ width: `${progress * 100}%` }} />
      <span className="relative">{progress > 0 ? "Keep holding…" : "SOS — hold 3 seconds"}</span>
    </button>
  );
}

function PrivacyView({ paused, onToggle, onBack }: { paused: boolean; onToggle: () => void; onBack: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 bg-background p-6 text-foreground">
      <h1 className="text-elder-lg font-extrabold">What my family can see</h1>
      <ul className="space-y-3 text-elder-sm">
        <li>✓ When you press <b>I TOOK IT</b></li>
        <li>✓ The last time you used this app</li>
        <li>✓ When you tap <b>I'm okay today</b></li>
        <li>✓ When you press <b>SOS</b></li>
      </ul>
      <h2 className="text-elder-md font-bold">What they can NOT see</h2>
      <ul className="space-y-3 text-elder-sm">
        <li>✗ Where you are</li>
        <li>✗ Your camera or microphone</li>
        <li>✗ Your messages, calls or photos</li>
      </ul>
      <button onClick={onToggle} className={`rounded-3xl border-4 py-6 text-elder-md font-bold ${paused ? "border-success bg-success text-success-foreground" : "border-foreground bg-card"}`}>
        {paused ? "Sharing is paused — tap to resume" : "Pause sharing"}
      </button>
      {paused && <p className="text-elder-xs text-muted-foreground">Your family will see "Paused by choice". No alarm is sent. SOS still works.</p>}
      <button onClick={onBack} className="rounded-3xl bg-primary py-6 text-elder-md font-bold text-primary-foreground">Back</button>
    </main>
  );
}
