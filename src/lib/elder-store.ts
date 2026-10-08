// Simple on-device storage for Elder mode (Milestone 1 — no backend yet).
// Everything is saved in the phone's localStorage so it survives a refresh.

export type Slot = "Morning" | "Afternoon" | "Night";

export type Medicine = {
  id: string;
  name: string;
  dose: string;
  time: string; // "HH:MM" 24h
  slot: Slot;
  color: string; // pill colour shown on screen (CSS colour token)
  note: string;
};

// Realistic sample medicines for the demo.
export const SAMPLE_MEDICINES: Medicine[] = [
  { id: "m1", name: "Metformin", dose: "500 mg · 1 tablet", time: "08:00", slot: "Morning", color: "var(--pill-white)", note: "After breakfast" },
  { id: "m2", name: "Amlodipine", dose: "5 mg · 1 tablet", time: "09:00", slot: "Morning", color: "var(--pill-pink)", note: "For blood pressure" },
  { id: "m3", name: "Vitamin D3", dose: "1 capsule", time: "14:00", slot: "Afternoon", color: "var(--pill-yellow)", note: "After lunch" },
  { id: "m4", name: "Atorvastatin", dose: "10 mg · 1 tablet", time: "21:00", slot: "Night", color: "var(--pill-blue)", note: "Before sleep" },
];

export type ElderState = {
  confirmed: Record<string, string>; // key "YYYY-MM-DD_medId" -> ISO time confirmed
  lastCheckin: string | null; // "YYYY-MM-DD"
  paused: boolean;
  demoOffsetMin: number; // demo only: shifts the clock forward
};

const KEY = "familycare-elder-v1";

export const emptyState: ElderState = { confirmed: {}, lastCheckin: null, paused: false, demoOffsetMin: 0 };

export function loadState(): ElderState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

export function saveState(s: ElderState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Minutes since midnight for "HH:MM".
export const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};

export const prettyTime = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
};
