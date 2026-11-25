import { describe, expect, it } from "vitest";
import { canManageMedicines, canRespondToSos } from "./family-access";

describe("family circle access", () => {
  it("lets only the owner manage medicines", () => {
    expect(canManageMedicines("owner")).toBe(true);
    expect(canManageMedicines("member")).toBe(false);
  });

  it("lets every linked family role respond to SOS", () => {
    expect(canRespondToSos("owner")).toBe(true);
    expect(canRespondToSos("member")).toBe(true);
  });
});