import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.NATIONAL_ID_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64 || !/^[a-f0-9]+$/i.test(hex)) {
    throw new Error(
      "NATIONAL_ID_ENCRYPTION_KEY must be a 64-character hex string. " +
        "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

export function validateNationalIdCryptoConfig(): void {
  getKey();
  if (!process.env.NATIONAL_ID_HASH_SALT) {
    throw new Error("NATIONAL_ID_HASH_SALT is required for national ID uniqueness checks");
  }
}

export function encryptNationalId(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64")
  ].join(":");
}

export function decryptNationalId(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted national ID format");
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw new Error("National ID decryption failed: data may be tampered");
  }
}

export function hashNationalIdForIndex(plaintext: string): string {
  const salt = process.env.NATIONAL_ID_HASH_SALT;
  if (!salt) {
    throw new Error("NATIONAL_ID_HASH_SALT is required");
  }
  return crypto.createHash("sha256").update(`${plaintext}${salt}`).digest("hex");
}

export function maskNationalId(encryptedOrPlain: string): string {
  const plain = encryptedOrPlain.includes(":")
    ? decryptNationalId(encryptedOrPlain)
    : encryptedOrPlain;
  if (plain.length < 4) return "****";
  return `${plain.slice(0, 4)}****`;
}
