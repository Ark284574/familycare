export type SosNotificationRef = { tag?: string; data?: unknown };

/** Match the notification for an SOS, including older alerts tagged by elder. */
export function matchesSosNotification(
  notification: SosNotificationRef,
  target: { sosId: string; elderId: string },
) {
  const data = notification.data && typeof notification.data === "object"
    ? notification.data as Record<string, unknown>
    : {};
  return data["sosId"] === target.sosId
    || data["elderId"] === target.elderId
    || notification.tag === `sos-${target.sosId}`
    || Boolean(notification.tag?.startsWith(`sos-${target.elderId}-`));
}