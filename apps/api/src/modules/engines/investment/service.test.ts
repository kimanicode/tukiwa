import { InvestmentStatus, InvestmentType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { InvestmentEngineService } from "./service";

describe("InvestmentEngineService", () => {
  it("calculates member share value with unequal shares", async () => {
    const service = new InvestmentEngineService({
      prisma: {
        investment: {
          findMany: async () => [
            {
              name: "Fund",
              type: InvestmentType.MONEY_MARKET,
              amount: 10000,
              currentValue: 15000,
              status: InvestmentStatus.ACTIVE,
              returns: []
            }
          ]
        },
        chamaMember: {
          findMany: async () => [
            { id: "m1", userId: "u1", shares: 1, user: { fullName: "One" } },
            { id: "m2", userId: "u2", shares: 2, user: { fullName: "Two" } }
          ]
        }
      }
    });

    const portfolio = await service.portfolio("chama-1");
    expect(portfolio.members).toEqual([
      { memberId: "m1", userId: "u1", fullName: "One", shares: 1, shareValue: 5000 },
      { memberId: "m2", userId: "u2", fullName: "Two", shares: 2, shareValue: 10000 }
    ]);
  });
});
