import { ContributionStatus, LoanStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { handleWhatsAppCommand } from "./commands";

function prisma() {
  return {
    user: {
      findUnique: async () => ({ id: "user-1", phone: "254712345678" })
    },
    chamaMember: {
      findMany: async () => [
        {
          id: "member-1",
          chamaId: "chama-1",
          chama: { name: "Alpha" },
          contributions: [
            { amount: 1000, status: ContributionStatus.PAID },
            { amount: 500, status: ContributionStatus.PENDING }
          ]
        }
      ],
      findFirst: async () => ({
        id: "member-1",
        chamaId: "chama-1",
        chama: { name: "Alpha" }
      })
    },
    contribution: {
      create: async () => ({ id: "contribution-1" }),
      update: async () => ({}),
      findMany: async () => [
        { amount: 1000, status: ContributionStatus.PAID, chama: { name: "Alpha" } }
      ]
    },
    loan: {
      findMany: async () => [
        {
          totalDue: 5000,
          status: LoanStatus.DISBURSED,
          repayments: [{ amount: 1000 }],
          chama: { name: "Alpha" }
        }
      ]
    }
  };
}

describe("handleWhatsAppCommand", () => {
  it("formats BALANCE", async () => {
    await expect(handleWhatsAppCommand("254712345678", "BAL", { prisma: prisma() })).resolves.toContain("Alpha");
  });

  it("initiates PAY", async () => {
    await expect(
      handleWhatsAppCommand("254712345678", "PAY 50 Alpha", {
        prisma: prisma(),
        stkPush: async () => ({ checkoutRequestId: "stk-1" })
      })
    ).resolves.toBe("STK Push sent to 2547XXXX678");
  });

  it("formats STATUS and HISTORY", async () => {
    await expect(handleWhatsAppCommand("254712345678", "STATUS", { prisma: prisma() })).resolves.toContain("outstanding");
    await expect(handleWhatsAppCommand("254712345678", "HISTORY", { prisma: prisma() })).resolves.toContain("PAID");
  });

  it("returns help for unknown commands", async () => {
    await expect(handleWhatsAppCommand("254712345678", "NOPE", { prisma: prisma() })).resolves.toBe("Type HELP to see available commands");
  });
});
