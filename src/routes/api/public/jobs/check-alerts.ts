// Scheduled check: sends "not confirmed" dose alerts and "no check-in yet" alerts by push.
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const GRACE_MIN = 30;
const toMin = (t: string) => { const [h = 0, m = 0] = t.split(":").map(Number); return h * 60 + m; };

export const Route = createFileRoute("/api/public/jobs/check-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { sendToFamily } = await import("@/lib/push.server");
        const { DEFAULT_SETTINGS, localNow } = await import("@/lib/quiet-hours");

        const { data: elders } = await db.from("elders").select("id, name, owner_id, last_checkin_date, sharing_paused, paired_at").not("paired_at", "is", null).eq("sharing_paused", false);
        let alerts = 0;
        for (const el of elders ?? []) {
          const { data: s } = await db.from("notification_settings").select("timezone, checkin_by").eq("user_id", el.owner_id).maybeSingle();
          const tz = s?.timezone ?? DEFAULT_SETTINGS.timezone;
          const { day, time } = localNow(tz);
          const nowMin = toMin(time);

          const [{ data: meds }, { data: done }] = await Promise.all([
            db.from("medicines").select("id, name, time").eq("elder_id", el.id),
            db.from("dose_events").select("medicine_id").eq("elder_id", el.id).eq("day", day),
          ]);
          const confirmed = new Set((done ?? []).map((d) => d.medicine_id));
          for (const m of meds ?? []) {
            if (confirmed.has(m.id) || nowMin - toMin(m.time) < GRACE_MIN) continue;
            // Claim the alert first so it's sent only once per dose per day.
            const { error } = await db.from("alerts_sent").insert({ key: `dose:${day}:${m.id}` });
            if (error) continue;
            await sendToFamily(db, el.owner_id, "dose", {
              title: `${el.name}: ${m.name} not confirmed`,
              body: `The ${m.time} dose hasn't been confirmed yet. Maybe give them a call.`,
              url: "/family",
              tag: `dose-${m.id}-${day}`,
            });
            alerts++;
          }

          const by = s?.checkin_by ?? DEFAULT_SETTINGS.checkin_by;
          if (el.last_checkin_date !== day && nowMin >= toMin(by)) {
            const { error } = await db.from("alerts_sent").insert({ key: `checkin:${day}:${el.id}` });
            if (!error) {
              await sendToFamily(db, el.owner_id, "checkin", {
                title: `${el.name} hasn't checked in today`,
                body: `No "I'm okay" tap yet today (by ${by}).`,
                url: "/family",
                tag: `checkin-${el.id}-${day}`,
              });
              alerts++;
            }
          }
        }
        return Response.json({ ok: true, alerts });
      },
    },
  },
});
