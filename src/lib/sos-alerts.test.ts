import { describe, expect, it } from "vitest";
import { matchesSosNotification } from "./sos-alerts";

describe("SOS notification clearing", () => {
  it("matches the resolved SOS and other active alerts for that elder, but not another elder", () => {
    const target = { sosId: "sos-123", elderId: "elder-456" };

    expect(matchesSosNotification({ tag: "sos-sos-123" }, target)).toBe(true);
    expect(matchesSosNotification({ tag: "sos-elder-456-1700000000" }, target)).toBe(true);
    expect(matchesSosNotification({ tag: "sos-elder-789-1700000000" }, target)).toBe(false);
    expect(matchesSosNotification({ tag: "dose-elder-456" }, target)).toBe(false);
  });
});