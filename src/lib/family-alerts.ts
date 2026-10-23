// Family-side alerts: phone notifications + a loud siren when a parent presses SOS.

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/notify-sw.js");
  } catch {
    return null;
  }
}

export async function enableNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  const p = await Notification.requestPermission();
  if (p === "granted") await registration();
  return p;
}

export async function showSosNotification(name: string, sosId: string, hasLocation: boolean) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const url = `/family#sos-${sosId}`;
  const title = `SOS: ${name} needs help`;
  const body = hasLocation ? "Tap to open the dashboard and see their location." : "Tap to open the dashboard. Location not available.";
  const reg = await registration();
  if (reg) {
    await reg.showNotification(title, { body, tag: `sos-${sosId}`, requireInteraction: true, data: { url } });
  } else {
    const n = new Notification(title, { body, tag: `sos-${sosId}`, requireInteraction: true });
    n.onclick = () => { window.focus(); window.location.hash = `sos-${sosId}`; n.close(); };
  }
}

// Gentle alert (no siren): a dose is still "not confirmed" after the grace period.
export async function showDoseNotification(name: string, medName: string, time: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const title = `${name}: ${medName} not confirmed`;
  const body = `The ${time} dose has not been confirmed yet. Maybe give them a call.`;
  const tag = `dose-${name}-${medName}-${time}`;
  const reg = await registration();
  if (reg) await reg.showNotification(title, { body, tag, data: { url: "/family" } });
  else new Notification(title, { body, tag });
}

export function playSiren() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    for (let i = 0; i < 6; i++) {
      o.frequency.setValueAtTime(i % 2 ? 660 : 990, ctx.currentTime + i * 0.4);
    }
    o.start();
    o.stop(ctx.currentTime + 2.4);
    o.onended = () => void ctx.close();
  } catch { /* audio blocked */ }
}
