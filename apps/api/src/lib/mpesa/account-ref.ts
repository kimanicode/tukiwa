/**
 * Generates a short unique M-Pesa account reference for a chama.
 * Rules:
 *   - Max 12 characters
 *   - Alphanumeric only
 *   - Uppercase
 *   - Derived from chama name + short UUID suffix
 */
export function generateAccountRef(chamaName: string, chamaId: string): string {
  const namePrefix = chamaName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 7);

  const idSuffix = chamaId.replace(/-/g, "").slice(-4).toUpperCase();

  return `${namePrefix || "CHAMA"}${idSuffix}`.slice(0, 12);
}

/**
 * Validates that a string is a valid M-Pesa account reference.
 * Used before storing and before STK Push calls.
 */
export function isValidAccountRef(ref: string): boolean {
  return /^[A-Z0-9]{1,12}$/.test(ref);
}
