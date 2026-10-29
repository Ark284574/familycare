// Notification-only worker: no caching. Shows push alerts (even when the app is closed)
// and opens the dashboard when an alert is tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  const isSos = (d.tag || "").startsWith("sos");
  event.waitUntil(
    self.registration.showNotification(d.title || "FamilyCare", {
      body: d.body || "",
      tag: d.tag || undefined,
      requireInteraction: isSos,
      vibrate: isSos ? [400, 200, 400, 200, 400] : [200],
      data: { url: d.url || "/family" },
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
