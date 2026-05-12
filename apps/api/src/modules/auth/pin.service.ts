import bcrypt from "bcrypt";

const PIN_SALT_ROUNDS = 12;
const PIN_PATTERN = /^\d{4}$/;

export function validatePinFormat(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  if (!validatePinFormat(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  return bcrypt.hash(pin, PIN_SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!validatePinFormat(pin)) {
    return false;
  }

  return bcrypt.compare(pin, hash);
}
