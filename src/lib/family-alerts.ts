// Family-side alerts: push subscription, in-page notifications and a siren.
import { savePushSubscription } from "./family.functions";
import { matchesSosNotification } from "./sos-alerts";

const inPageSosNotifications = new Map<string, { elderId: string; notification: Notification }>();

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
  const p256dh = j.keys?.["p256dh"], auth = j.keys?.["auth"];
  if (!j.endpoint || !p256dh || !auth) return false;
  await savePushSubscription({ data: { endpoint: j.endpoint, p256dh, auth } });
  return true;
}

export async function enableNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  const p = await Notification.requestPermission();
  if (p === "granted") await subscribePush().catch(() => false);
  return p;
}

export async function showSosNotification(name: string, sosId: string, elderId: string, hasLocation: boolean) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const url = `/family#sos-${sosId}`;
  const title = `SOS: ${name} needs help`;
  const body = hasLocation ? "Tap to open the dashboard and see their location." : "Tap to open the dashboard. Location not available.";
  const reg = await registration();
  if (reg) {
    await reg.showNotification(title, { body, tag: `sos-${sosId}`, requireInteraction: true, data: { url, sosId, elderId } });
  } else {
    const n = new Notification(title, { body, tag: `sos-${sosId}`, requireInteraction: true, data: { sosId, elderId } });
    inPageSosNotifications.set(sosId, { elderId, notification: n });
    n.onclick = () => { window.focus(); window.location.hash = `sos-${sosId}`; n.close(); };
  }
}

/** Ask this phone's service worker to dismiss the matching SOS notification now. */
export async function closeSosNotification(sosId: string, elderId: string) {
  for (const [id, entry] of inPageSosNotifications) {
    if (matchesSosNotification({ tag: entry.notification.tag, data: { sosId: id, elderId: entry.elderId } }, { sosId, elderId })) {
      entry.notification.close();
      inPageSosNotifications.delete(id);
    }
  }
  const reg = await registration();
  const worker = navigator.serviceWorker.controller ?? reg?.active;
  worker?.postMessage({ type: "clear-sos", sosId, elderId });
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

// Gentle in-page alert (no siren): a dose is still "not confirmed" after the grace period.
export async function showDoseNotification(name: string, medName: string, time: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const title = `${name}: ${medName} not confirmed`;
  const body = `The ${time} dose has not been confirmed yet. Maybe give them a call.`;
  const tag = `dose-${name}-${medName}-${time}`;
  const reg = await registration();
  if (reg) await reg.showNotification(title, { body, tag, data: { url: "/family" } });
  else new Notification(title, { body, tag });
}
