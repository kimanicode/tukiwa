import { FeeTransactionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateFee } from "./fee.service";

describe("calculateFee", () => {
  it("applies the standard percentage rate", () => {
    expect(calculateFee(FeeTransactionType.CONTRIBUTION, 200000)).toEqual({
      feeAmount: 1600,
      netAmount: 200000,
      feeRate: 0.008,
      deductionModel: "on_top"
    });
  });

  it("applies the minimum fee floor", () => {
    const fee = calculateFee(FeeTransactionType.LOAN_REPAYMENT, 10000);
    expect(fee.feeAmount).toBe(500);
    expect(fee.netAmount).toBe(10000);
  });

  it("applies the maximum fee cap", () => {
    const fee = calculateFee(FeeTransactionType.LOAN_DISBURSEMENT, 10000000);
    expect(fee.feeAmount).toBe(50000);
    expect(fee.netAmount).toBe(9950000);
  });

  it("returns zero fee for zero amount", () => {
    const fee = calculateFee(FeeTransactionType.ROTATION_PAYOUT, 0);
    expect(fee.feeAmount).toBe(0);
    expect(fee.netAmount).toBe(0);
  });

  it("supports deducted payout models", () => {
    const fee = calculateFee(FeeTransactionType.ROTATION_PAYOUT, 1200000);
    expect(fee.feeAmount).toBe(9600);
    expect(fee.netAmount).toBe(1190400);
    expect(fee.deductionModel).toBe("deducted");
  });
});
