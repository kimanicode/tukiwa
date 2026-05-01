import { ContributionStatus, FeeStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { validateCallback } from "../lib/mpesa";
import { processMpesaCallback } from "./mpesa-callback.job";

class FakePrisma {
  contribution = {
    record: {
      id: "contribution-1",
      chamaId: "chama-1",
      mpesaRef: "checkout-1",
      status: ContributionStatus.PENDING,
      mpesaReceiptNum: null as string | null,
      paidAt: null as Date | null
    },
    findUnique: async ({ where }: any) => {
      return where.mpesaRef === this.contribution.record.mpesaRef ||
        where.id === this.contribution.record.id
        ? this.contribution.record
        : null;
    },
    update: async ({ data }: any) => {
      Object.assign(this.contribution.record, data);
      return this.contribution.record;
    }
  };

  auditLogs: unknown[] = [];
  platformFees = [{ referenceId: "contribution-1", status: FeeStatus.PENDING }];

  auditLog = {
    create: async ({ data }: any) => {
      this.auditLogs.push(data);
      return data;
    }
  };

  platformFee = {
    updateMany: async ({ where, data }: any) => {
      for (const fee of this.platformFees) {
        if (
          fee.referenceId === where.referenceId &&
          (!where.status || fee.status === where.status)
        ) {
          Object.assign(fee, data);
        }
      }
      return { count: this.platformFees.length };
    }
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

describe("processMpesaCallback", () => {
  it("is idempotent for duplicate callbacks", async () => {
    const prisma = new FakePrisma();
    const events: unknown[] = [];
    const callback = validateCallback(callbackPayload("checkout-1"));

    await processMpesaCallback(
      { callback },
      {
        prisma: prisma as any,
        emit: (_chamaId, event) => {
          events.push(event);
        }
      }
    );
    await processMpesaCallback(
      { callback },
      {
        prisma: prisma as any,
        emit: (_chamaId, event) => {
          events.push(event);
        }
      }
    );

    expect(prisma.contribution.record.status).toBe(ContributionStatus.PAID);
    expect(prisma.contribution.record.mpesaReceiptNum).toBe("RCP123");
    expect(prisma.platformFees[0]?.status).toBe(FeeStatus.SETTLED);
    expect(prisma.auditLogs).toHaveLength(1);
    expect(events).toHaveLength(1);
  });
});

function callbackPayload(checkoutRequestId: string) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-1",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 1000 },
            { Name: "MpesaReceiptNumber", Value: "RCP123" },
            { Name: "TransactionDate", Value: 20260430120000 },
            { Name: "PhoneNumber", Value: 254712345678 }
          ]
        }
      }
    }
  };
}
