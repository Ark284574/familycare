import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, inQuietHours, localNow, shouldNotify } from "./quiet-hours";

const quiet = { ...DEFAULT_SETTINGS, quiet_enabled: true, quiet_start: "22:00", quiet_end: "07:00" };

describe("alert rules", () => {
  it("overnight quiet hours include 23:30 and 06:59 but not 07:00", () => {
    expect(inQuietHours("23:30", "22:00", "07:00")).toBe(true);
    expect(inQuietHours("06:59", "22:00", "07:00")).toBe(true);
    expect(inQuietHours("07:00", "22:00", "07:00")).toBe(false);
  });
  it("dose alerts are held during quiet hours", () => {
    expect(shouldNotify("dose", quiet, "23:00")).toBe(false);
    expect(shouldNotify("dose", quiet, "12:00")).toBe(true);
  });
  it("SOS still comes through during quiet hours by default", () => {
    expect(shouldNotify("sos", quiet, "02:00")).toBe(true);
    expect(shouldNotify("sos", { ...quiet, sos_ignores_quiet: false }, "02:00")).toBe(false);
  });
  it("a switched-off alert type is never sent", () => {
    expect(shouldNotify("checkin", { ...DEFAULT_SETTINGS, checkin_alerts: false }, "12:00")).toBe(false);
  });
  it("local time uses the family's time zone", () => {
    expect(localNow("Asia/Kolkata", new Date("2026-10-23T17:45:00Z"))).toEqual({ day: "2026-10-23", time: "23:15" });
  });
});
