import { describe, expect, it } from "vitest";
import { TableBankingService } from "./service";

describe("TableBankingService", () => {
  it("rejects instant loan if pool is insufficient", async () => {
    const prisma: any = {
      contribution: { aggregate: async () => ({ _sum: { amount: 1000 } }) },
      loan: { aggregate: async () => ({ _sum: { amount: 0, totalDue: 0 } }) },
      loanRepayment: { aggregate: async () => ({ _sum: { amount: 0 } }) }
    };
    const service = new TableBankingService({
      prisma,
      checkEligibility: async () => ({ eligible: true, maxAmount: 10000 })
    });

    await expect(service.instantLoan("chama-1", "user-1", 2000)).resolves.toEqual({
      approved: false,
      reason: "Pool balance insufficient"
    });
  });
});
