const SENSITIVE_KEYS = [
  "pin",
  "pinHash",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "nationalId",
  "otp",
  "code",
  "authorization",
  "mpesaReceiptNum"
];

export function sanitiseForLog(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.some((sensitive) =>
        key.toLowerCase().includes(sensitive.toLowerCase())
      )
        ? "[REDACTED]"
        : value
    ])
  );
}

export function maskPhone(phone: string): string {
  if (phone.length < 10) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

export function maskNationalId(id: string): string {
  if (id.length < 4) return "****";
  return `${id.slice(0, 4)}****`;
}
