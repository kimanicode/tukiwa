import { describe, expect, it } from "vitest";
import { checkLoanEligibility } from "./eligibility.service";

function fakePrisma(overrides: {
  kycVerified?: boolean;
  activeLoan?: boolean;
  paidAmount?: number;
  multiplier?: number;
} = {}) {
  return {
    user: {
      findUnique: async () => ({ kycVerified: overrides.kycVerified ?? true })
    },
    loan: {
      findFirst: async () => (overrides.activeLoan ? { id: "loan-1" } : null)
    },
    chamaSettings: {
      findUnique: async () => ({ maxLoanMultiplier: overrides.multiplier ?? 3 })
    },
    contribution: {
      aggregate: async () => ({ _sum: { amount: overrides.paidAmount ?? 10000 } })
    }
  };
}

describe("checkLoanEligibility", () => {
  it("allows eligible borrowers", async () => {
    await expect(
      checkLoanEligibility("user-1", "chama-1", 20000, {
        prisma: fakePrisma()
      })
    ).resolves.toEqual({ eligible: true, maxAmount: 30000 });
  });

  it("rejects over-limit requests", async () => {
    await expect(
      checkLoanEligibility("user-1", "chama-1", 40000, {
        prisma: fakePrisma()
      })
    ).resolves.toEqual({
      eligible: false,
      maxAmount: 30000,
      reason: "Requested amount exceeds limit"
    });
  });

  it("rejects users with active loans", async () => {
    await expect(
      checkLoanEligibility("user-1", "chama-1", 1000, {
        prisma: fakePrisma({ activeLoan: true })
      })
    ).resolves.toMatchObject({ eligible: false, reason: "Active loan exists" });
  });

  it("rejects unverified KYC", async () => {
    await expect(
      checkLoanEligibility("user-1", "chama-1", 1000, {
        prisma: fakePrisma({ kycVerified: false })
      })
    ).resolves.toEqual({
      eligible: false,
      maxAmount: 0,
      reason: "KYC not verified"
    });
  });
});
