// Notification-only worker: no caching. Lets phones show SOS alerts and open the dashboard on tap.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
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
