// On-device storage for Elder mode.
// - Paired phones keep only a secret "device token" here; real data lives in Lovable Cloud.
// - Unpaired phones run a demo using the sample medicines below.

export type Slot = "Morning" | "Afternoon" | "Night";

export type Medicine = {
  id: string;
  name: string;
  dose: string;
  time: string; // "HH:MM" 24h
  color: string; // pill colour (CSS colour token)
  note: string;
};

export const slotOf = (time: string): Slot => (toMin(time) < 12 * 60 ? "Morning" : toMin(time) < 17 * 60 ? "Afternoon" : "Night");

// Realistic sample medicines for the demo.
export const SAMPLE_MEDICINES: Medicine[] = [
  { id: "m1", name: "Metformin", dose: "500 mg · 1 tablet", time: "08:00", color: "var(--pill-white)", note: "After breakfast" },
  { id: "m2", name: "Amlodipine", dose: "5 mg · 1 tablet", time: "09:00", color: "var(--pill-pink)", note: "For blood pressure" },
  { id: "m3", name: "Vitamin D3", dose: "1 capsule", time: "14:00", color: "var(--pill-yellow)", note: "After lunch" },
  { id: "m4", name: "Atorvastatin", dose: "10 mg · 1 tablet", time: "21:00", color: "var(--pill-blue)", note: "Before sleep" },
];

export const PILL_COLORS = [
  { label: "White", value: "var(--pill-white)" },
  { label: "Pink", value: "var(--pill-pink)" },
  { label: "Yellow", value: "var(--pill-yellow)" },
  { label: "Blue", value: "var(--pill-blue)" },
];

export type DemoState = {
  confirmed: Record<string, string>; // key "YYYY-MM-DD_medId" -> ISO time
  lastCheckin: string | null;
  paused: boolean;
};

const DEMO_KEY = "familycare-elder-v1";
const DEVICE_KEY = "familycare-device";

export const emptyDemo: DemoState = { confirmed: {}, lastCheckin: null, paused: false };

export function loadDemo(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? { ...emptyDemo, ...JSON.parse(raw) } : emptyDemo;
  } catch {
    return emptyDemo;
  }
}
export const saveDemo = (s: DemoState) => localStorage.setItem(DEMO_KEY, JSON.stringify(s));

export const getDeviceToken = () => localStorage.getItem(DEVICE_KEY);
export const setDeviceToken = (t: string | null) =>
  t ? localStorage.setItem(DEVICE_KEY, t) : localStorage.removeItem(DEVICE_KEY);

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Minutes since midnight for "HH:MM".
export const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};

export const prettyTime = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
