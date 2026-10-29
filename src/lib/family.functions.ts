// Server functions used by signed-in FAMILY members.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Save this phone's push subscription so alerts arrive even when the app is closed.
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ endpoint: z.string().url().max(2000), p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Endpoint is unique per phone; re-assign it to whoever is signed in now.
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    const { error } = await context.supabase.from("push_subscriptions").insert({ ...data, user_id: context.userId });
    if (error) throw new Error("Could not save this phone for alerts");
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendToFamily } = await import("./push.server");
    // Test uses the SOS rule so it isn't held back by quiet hours.
    const r = await sendToFamily(supabaseAdmin, context.userId, "sos", {
      title: "FamilyCare test alert",
      body: "Alerts are working on this phone.",
      url: "/family",
      tag: "test",
    });
    return { sent: r.sent };
  });

// Ask a question about a loved one; the answer uses only their stored records.
export const askAboutElder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ elderId: z.string().uuid(), question: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = context.supabase; // RLS: only this family's own elder
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const { data: elder } = await db.from("elders").select("id, name, sharing_paused, last_active_at").eq("id", data.elderId).maybeSingle();
    if (!elder) return { ok: false as const, error: "Parent not found." };
    const [meds, doses, checkins, sos] = await Promise.all([
      db.from("medicines").select("id, name, dose, time, pills_remaining, created_at").eq("elder_id", elder.id).order("time"),
      db.from("dose_events").select("medicine_id, day, confirmed_at").eq("elder_id", elder.id).gte("day", since).order("day"),
      db.from("checkins").select("day").eq("elder_id", elder.id).gte("day", since).order("day"),
      db.from("sos_events").select("created_at, resolved").eq("elder_id", elder.id).gte("created_at", since).order("created_at"),
    ]);
    const medName = new Map((meds.data ?? []).map((m) => [m.id, `${m.name} (${m.time})`]));
    const today = new Date().toISOString().slice(0, 10);
    const records = [
      `Today (server date): ${today}. Records cover ${since} to ${today}.`,
      `Parent: ${elder.name}. Sharing paused: ${elder.sharing_paused ? "yes" : "no"}. Last active: ${elder.last_active_at ?? "never"}.`,
      `Medicines (scheduled daily):`,
      ...(meds.data ?? []).map((m) => `- ${m.name} ${m.dose ?? ""} at ${m.time}, pills left ${m.pills_remaining}, added ${m.created_at.slice(0, 10)}`),
      `Confirmed doses (day, medicine, confirmed at):`,
      ...(doses.data ?? []).map((d) => `- ${d.day}, ${medName.get(d.medicine_id) ?? "deleted medicine"}, ${d.confirmed_at}`),
      `Daily "I'm okay" check-ins (days):`,
      (checkins.data ?? []).map((c) => c.day).join(", ") || "none",
      `SOS events:`,
      ...((sos.data ?? []).length ? (sos.data ?? []).map((s) => `- ${s.created_at} (${s.resolved ? "handled" : "open"})`) : ["none"]),
    ].join("\n");

    const instructions = `You help a family member understand their elderly parent's medicine and check-in records in the FamilyCare app.
Answer ONLY from the records below. If the records don't contain the answer, say so plainly. Never guess or invent data.
Never use the word "missed"; say "not confirmed" instead. A dose with no confirmation on a day is "not confirmed" (it may have been taken without pressing the button).
Do not give medical advice or dosage changes; suggest asking a doctor when relevant. Keep answers short, warm and in simple English. Use times as written.

RECORDS:
${records}`;

    try {
      const { askModel } = await import("./ai.server");
      return { ok: true as const, answer: await askModel(instructions, data.question) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Could not get an answer." };
    }
  });
