// Works out the green / yellow / red status for the family dashboard.
import { toMin } from "./elder-store";

export const GRACE_MIN = 30; // after this, an unconfirmed dose turns red

export type Status = "green" | "yellow" | "red" | "paused";

export function todayStatus(
  meds: { id: string; time: string }[],
  confirmedIds: Set<string>,
  now: Date,
  paused: boolean,
  openSos: boolean,
) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const dueSoFar = meds.filter((m) => toMin(m.time) <= nowMin);
  const late = dueSoFar.filter((m) => !confirmedIds.has(m.id));
  const overGrace = late.filter((m) => nowMin - toMin(m.time) >= GRACE_MIN);
  let status: Status = "green";
  if (late.length) status = "yellow";
  if (overGrace.length) status = "red";
  if (paused) status = "paused";
  if (openSos) status = "red"; // SOS always shows
  return { status, confirmed: meds.filter((m) => confirmedIds.has(m.id)).length, total: meds.length, notConfirmed: overGrace };
}
