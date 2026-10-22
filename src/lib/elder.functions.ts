// Server functions used by the ELDER's phone.
// The elder never logs in. After pairing, their phone keeps a secret
// "device token". Every call checks that token on the server before
// reading or writing anything for that elder.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const token = z.string().uuid();

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Find the elder that owns this device token, or throw.
async function elderFor(deviceToken: string) {
  const db = await admin();
  const { data } = await db
    .from("elders")
    .select("id, name, sharing_paused, last_checkin_date, paired_at")
    .eq("device_token", deviceToken)
    .maybeSingle();
  if (!data || !data.paired_at) throw new Error("This phone is not paired");
  return { db, elder: data };
}

// 1. Pair: the elder types the 6-digit code family sees on their screen.
export const pairDevice = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: elder } = await db
      .from("elders")
      .select("id, name, paired_at")
      .eq("pairing_code", data.code)
      .maybeSingle();
    if (!elder) return { ok: false as const, error: "Code not found. Please check the numbers." };
    // Give this phone a fresh token (un-pairs any older phone).
    const newToken = crypto.randomUUID();
    await db.from("elders").update({ device_token: newToken, paired_at: new Date().toISOString() }).eq("id", elder.id);
    return { ok: true as const, deviceToken: newToken, name: elder.name };
  });

// 2. Load today's medicines and confirmations. Also marks "last active".
export const getElderToday = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ deviceToken: token, day }).parse(d))
  .handler(async ({ data }) => {
    const { db, elder } = await elderFor(data.deviceToken);
    await db.from("elders").update({ last_active_at: new Date().toISOString() }).eq("id", elder.id);
    const [{ data: meds }, { data: events }] = await Promise.all([
      db.from("medicines").select("id, name, dose, time, note, color").eq("elder_id", elder.id).order("time"),
      db.from("dose_events").select("medicine_id, confirmed_at").eq("elder_id", elder.id).eq("day", data.day),
    ]);
    return {
      name: elder.name,
      paused: elder.sharing_paused,
      checkedIn: elder.last_checkin_date === data.day,
      medicines: meds ?? [],
      confirmed: Object.fromEntries((events ?? []).map((e) => [e.medicine_id, e.confirmed_at])),
    };
  });

// 3. "I TOOK IT". The database allows only one confirmation per medicine per day.
export const confirmDose = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ deviceToken: token, day, medicineId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db, elder } = await elderFor(data.deviceToken);
    const { data: med } = await db
      .from("medicines")
      .select("id, pills_remaining")
      .eq("id", data.medicineId)
      .eq("elder_id", elder.id)
      .maybeSingle();
    if (!med) throw new Error("Medicine not found");
    const { error } = await db.from("dose_events").insert({ elder_id: elder.id, medicine_id: med.id, day: data.day });
    if (error) return { ok: true, alreadyDone: true }; // already confirmed: locked
    await db.from("medicines").update({ pills_remaining: Math.max(0, med.pills_remaining - 1) }).eq("id", med.id);
    await db.from("elders").update({ last_active_at: new Date().toISOString() }).eq("id", elder.id);
    return { ok: true, alreadyDone: false };
  });

export const checkIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ deviceToken: token, day }).parse(d))
  .handler(async ({ data }) => {
    const { db, elder } = await elderFor(data.deviceToken);
    await db.from("elders").update({ last_checkin_date: data.day, last_active_at: new Date().toISOString() }).eq("id", elder.id);
    return { ok: true };
  });

// SOS. Location is optional: it is read ONLY at the moment SOS is sent.
export const sendSos = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      deviceToken: token,
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      accuracy: z.number().min(0).max(100000).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db, elder } = await elderFor(data.deviceToken);
    const hasLoc = data.latitude !== undefined && data.longitude !== undefined;
    await db.from("sos_events").insert({
      elder_id: elder.id,
      ...(hasLoc ? { latitude: data.latitude, longitude: data.longitude, accuracy_m: data.accuracy ?? null } : {}),
    } as never);
    return { ok: true };
  });

export const setSharingPaused = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ deviceToken: token, paused: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { db, elder } = await elderFor(data.deviceToken);
    await db.from("elders").update({ sharing_paused: data.paused }).eq("id", elder.id);
    return { ok: true };
  });
