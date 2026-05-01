import { FeeStatus, RotationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { MerryGoRoundService } from "./service";

describe("MerryGoRoundService", () => {
  it("payout triggers only when all contributions are paid", async () => {
    const rotation = {
      id: "rotation-1",
      chamaId: "chama-1",
      memberId: "member-1",
      amount: 30000,
      scheduledAt: new Date(),
      status: RotationStatus.SCHEDULED,
      member: { user: { phone: "254712345678" } }
    };
    const prisma: any = {
      rotation: {
        findFirst: async () => rotation,
        update: async ({ data }: any) => Object.assign(rotation, data)
      },
      contribution: {
        unpaid: 1,
        count: async function () {
          return this.unpaid;
        }
      },
      auditLog: { create: async () => ({}) },
      platformFees: [] as any[],
      platformFee: {
        create: async ({ data }: any) => {
          const fee = { id: `fee-${prisma.platformFees.length + 1}`, status: FeeStatus.PENDING, ...data };
          prisma.platformFees.push(fee);
          return fee;
        },
        updateMany: async ({ where, data }: any) => {
          for (const fee of prisma.platformFees) {
            if (fee.referenceId === where.referenceId && (!where.status || fee.status === where.status)) {
              Object.assign(fee, data);
            }
          }
          return { count: prisma.platformFees.length };
        }
      },
      $transaction: async (callback: any) => callback(prisma)
    };
    const service = new MerryGoRoundService({
      prisma,
      b2cTransfer: async () => ({ conversationId: "b2c-1" })
    });

    await expect(service.payout("chama-1", "admin")).rejects.toMatchObject({
      statusCode: 400
    });

    prisma.contribution.unpaid = 0;
    const paid = await service.payout("chama-1", "admin");
    expect(paid.status).toBe(RotationStatus.PAID);
    expect(prisma.platformFees[0]).toMatchObject({ referenceId: "rotation-1", feeAmount: 500 });
  });
});
