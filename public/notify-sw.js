// Notification-only worker: no caching. Shows push alerts (even when the app is closed)
// and opens the dashboard when an alert is tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function clearSosNotifications(sosId, elderId) {
  const notifications = await self.registration.getNotifications();
  for (const notification of notifications) {
    if (!(notification.tag || "").startsWith("sos-")) continue;
    const data = notification.data || {};
    const matches = data.sosId === sosId || data.elderId === elderId || notification.tag === `sos-${sosId}` || notification.tag.startsWith(`sos-${elderId}-`);
    if (matches) notification.close();
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "clear-sos" && typeof data.sosId === "string" && typeof data.elderId === "string") {
    event.waitUntil(clearSosNotifications(data.sosId, data.elderId));
  }
});

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  if (d.data?.action === "clear-sos") {
    event.waitUntil(clearSosNotifications(d.data.sosId, d.data.elderId));
    return;
  }
  const isSos = (d.tag || "").startsWith("sos");
  event.waitUntil(
    self.registration.showNotification(d.title || "FamilyCare", {
      body: d.body || "",
      tag: d.tag || undefined,
      requireInteraction: isSos,
      vibrate: isSos ? [400, 200, 400, 200, 400] : [200],
      data: { url: d.url || "/family", ...(d.data || {}) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/family";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (new URL(c.url).pathname === "/family") {
          await c.focus();
          c.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
