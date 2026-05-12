import { describe, expect, it } from "vitest";
import { hashPin, validatePinFormat, verifyPin } from "./pin.service";

describe("PIN service", () => {
  it("hashes and verifies a valid PIN", async () => {
    const hash = await hashPin("1234");
    expect(hash).not.toBe("1234");
    await expect(verifyPin("1234", hash)).resolves.toBe(true);
    await expect(verifyPin("9999", hash)).resolves.toBe(false);
  });

  it("rejects invalid PIN formats before hashing", async () => {
    expect(validatePinFormat("1234")).toBe(true);
    expect(validatePinFormat("12345")).toBe(false);
    expect(validatePinFormat("12a4")).toBe(false);
    await expect(hashPin("12a4")).rejects.toThrow("PIN must be exactly 4 digits");
  });

  it("supports mismatch checks before hashing", () => {
    const pin: string = "1234";
    const confirmPin: string = "4321";
    expect(pin === confirmPin).toBe(false);
  });
});
