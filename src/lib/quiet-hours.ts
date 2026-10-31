// Pure helpers for alert rules (shared by server + tests).

export type AlertKind = "sos" | "dose" | "checkin";

export type NotifySettings = {
  sos_alerts: boolean;
  dose_alerts: boolean;
  checkin_alerts: boolean;
  quiet_enabled: boolean;
  quiet_start: string; // "HH:MM"
  quiet_end: string; // "HH:MM"
  sos_ignores_quiet: boolean;
};

export const DEFAULT_SETTINGS: NotifySettings & { checkin_by: string; timezone: string } = {
  sos_alerts: true,
  dose_alerts: true,
  checkin_alerts: true,
  checkin_by: "11:00",
  quiet_enabled: false,
  quiet_start: "22:00",
  quiet_end: "07:00",
  sos_ignores_quiet: true,
  timezone: "Asia/Kolkata",
};

const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};

/** True when "HH:MM" falls inside quiet hours (handles overnight ranges like 22:00–07:00). */
export function inQuietHours(nowHHMM: string, start: string, end: string) {
  const n = toMin(nowHHMM), s = toMin(start), e = toMin(end);
  if (s === e) return false;
  return s < e ? n >= s && n < e : n >= s || n < e;
}

/** Decide whether this family member should get this alert right now. */
export function shouldNotify(kind: AlertKind, s: NotifySettings, nowHHMM: string) {
  const enabled = kind === "sos" ? s.sos_alerts : kind === "dose" ? s.dose_alerts : s.checkin_alerts;
  if (!enabled) return false;
  if (!s.quiet_enabled) return true;
  if (kind === "sos" && s.sos_ignores_quiet) return true;
  return !inQuietHours(nowHHMM, s.quiet_start, s.quiet_end);
}

/** Local date ("YYYY-MM-DD") and time ("HH:MM") in a time zone. */
export function localNow(timeZone: string, d = new Date()) {
  const parts: Record<string, string> = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts['year']}-${parts['month']}-${parts['day']}`, time: `${parts['hour']}:${parts['minute']}` };
}
