import fastify from "fastify";
import { describe, expect, it } from "vitest";
import contributionRoutes from ".";

describe("M-Pesa callback route", () => {
  it("validates, enqueues, and returns 200 without DB work", async () => {
    const jobs: unknown[] = [];
    const app = fastify();

    await app.register(contributionRoutes, {
      queue: {
        add: async (_name, data, options) => {
          jobs.push({ data, options });
          return {} as never;
        }
      }
    });
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/mpesa/callback",
      payload: callbackPayload("checkout-1")
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "accepted" });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      options: { jobId: "checkout-1" }
    });
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
