import { describe, expect, it, beforeEach } from "vitest";
import {
  decryptNationalId,
  encryptNationalId,
  maskNationalId,
  validateNationalIdCryptoConfig
} from "./national-id";

const key = "a".repeat(64);

describe("national ID encryption", () => {
  beforeEach(() => {
    process.env.NATIONAL_ID_ENCRYPTION_KEY = key;
    process.env.NATIONAL_ID_HASH_SALT = "salt";
  });

  it("round trips encrypted national IDs", () => {
    const encrypted = encryptNationalId("12345678");
    expect(decryptNationalId(encrypted)).toBe("12345678");
  });

  it("uses a random IV", () => {
    expect(encryptNationalId("12345678")).not.toBe(encryptNationalId("12345678"));
  });

  it("throws when ciphertext is tampered", () => {
    const encrypted = encryptNationalId("12345678");
    expect(() => decryptNationalId(`${encrypted.slice(0, -2)}xx`)).toThrow();
  });

  it("throws for wrong key length", () => {
    process.env.NATIONAL_ID_ENCRYPTION_KEY = "bad";
    expect(() => validateNationalIdCryptoConfig()).toThrow();
  });

  it("masks national IDs", () => {
    expect(maskNationalId("12345678")).toBe("1234****");
  });
});
