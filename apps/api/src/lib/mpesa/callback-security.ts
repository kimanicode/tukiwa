import { isIPInRange } from "./ip-utils";

// Safaricom Daraja IP ranges. Verify against current Safaricom documentation before production.
export const SAFARICOM_IP_RANGES = [
  "196.201.214.0/24",
  "196.201.214.200",
  "196.201.216.0/24",
  "196.201.216.1",
  "196.201.213.114",
  "196.201.214.206",
  "196.201.213.112",
  "196.201.214.207",
  "196.201.214.208",
  "196.201.213.115",
  "196.201.214.209",
  "196.201.213.116"
] as const;

export function isSafaricomIP(ip: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    if (["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip)) {
      return true;
    }
  }

  return SAFARICOM_IP_RANGES.some((range) =>
    range.includes("/") ? isIPInRange(ip, range) : normaliseIpv4(ip) === range
  );
}

function normaliseIpv4(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : ip;
}
