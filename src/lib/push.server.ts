// Server-only: sends web push notifications to a family member's phones,
// respecting their alert choices and quiet hours.
import { buildPushHTTPRequest } from "@pushforge/builder";
import { DEFAULT_SETTINGS, localNow, shouldNotify, type AlertKind } from "./quiet-hours";

type Db = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export type PushPayload = { title: string; body: string; url: string; tag: string };

export async function sendToFamily(db: Db, ownerId: string, kind: AlertKind, payload: PushPayload) {
  const jwk = process.env['VAPID_PRIVATE_JWK'];
  if (!jwk) return { sent: 0, skipped: "no-key" as const };

  const { data: s } = await db.from("notification_settings").select("*").eq("user_id", ownerId).maybeSingle();
  const settings = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  const { time } = localNow(settings.timezone);
  if (!shouldNotify(kind, settings, time)) return { sent: 0, skipped: "settings" as const };

  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", ownerId);
  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      const req = await buildPushHTTPRequest({
        privateJWK: jwk,
        subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message: {
          payload,
          adminContact: "mailto:alerts@familycare.app",
          options: { ttl: kind === "sos" ? 3600 : 1800, urgency: kind === "sos" ? "high" : "normal" },
        },
      });
      const res = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
      if (res.status === 404 || res.status === 410) {
        await db.from("push_subscriptions").delete().eq("id", sub.id); // phone unsubscribed
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
