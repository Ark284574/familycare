// Family-side alerts: push subscription, in-page notifications and a siren.
import { savePushSubscription } from "./family.functions";

// Public half of the push key pair (safe to ship to browsers).
export const VAPID_PUBLIC_KEY = "BBJxdwt-2pPkv_C9QY-XHFQ8MJlct7g5Swc32BZeCCHI6LM0BnRbljeQ1nFMuiLYhCiMUbouV5jRl_Y1IClEjWA";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/notify-sw.js");
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

function b64ToBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Subscribe this phone to push and save it for the signed-in family member. */
export async function subscribePush() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await registration();
  if (!reg) return false;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return false;
  await savePushSubscription({ data: { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth } });
  return true;
}

export async function enableNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  const p = await Notification.requestPermission();
  if (p === "granted") await subscribePush().catch(() => false);
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
