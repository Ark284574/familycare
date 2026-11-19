// Server-only: sends web push notifications to a family member's phones,
// respecting their alert choices and quiet hours.
import { buildPushHTTPRequest } from "@pushforge/builder";
import { DEFAULT_SETTINGS, localNow, shouldNotify, type AlertKind } from "./quiet-hours";

type Db = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export type PushPayload = { title: string; body: string; url: string; tag: string; data?: Record<string, string> };

async function deliverToFamily(db: Db, ownerId: string, payload: PushPayload, ttl: number, urgency: "high" | "normal") {
  const jwk = process.env['VAPID_PRIVATE_JWK'];
  if (!jwk) return { sent: 0, skipped: "no-key" as const };
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", ownerId);
  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      const req = await buildPushHTTPRequest({
        privateJWK: jwk,
        subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message: { payload, adminContact: "mailto:alerts@familycare.app", options: { ttl, urgency } },
      });
      const res = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
      if (res.status === 404 || res.status === 410) {
        await db.from("push_subscriptions").delete().eq("id", sub.id);
      } else if (res.ok) {
        sent++;
      } else {
        console.error("push failed", res.status, await res.text().catch(() => ""));
      }
    } catch (e) {
      console.error("push error", e);
    }
  }
  return { sent };
}

export async function sendToFamily(db: Db, ownerId: string, kind: AlertKind, payload: PushPayload) {
  const { data: s } = await db.from("notification_settings").select("*").eq("user_id", ownerId).maybeSingle();
  const settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  const { time } = localNow(settings.timezone);
  if (!shouldNotify(kind, settings, time)) return { sent: 0, skipped: "settings" as const };

  return deliverToFamily(db, ownerId, payload, kind === "sos" ? 3600 : 1800, kind === "sos" ? "high" : "normal");
}

// Clear signals must bypass alert preferences and quiet hours so resolved SOS
// notifications are dismissed on every family phone that received them.
export async function sendSosClearToFamily(db: Db, ownerId: string, elderId: string, sosIds: string[]) {
  let sent = 0;
  for (const sosId of sosIds) {
    const result = await deliverToFamily(db, ownerId, {
      title: "FamilyCare",
      body: "SOS alert cleared.",
      url: "/family",
      tag: `clear-sos-${sosId}`,
      data: { action: "clear-sos", sosId, elderId },
    }, 3600, "high");
    sent += result.sent;
  }
  return { sent };
}
