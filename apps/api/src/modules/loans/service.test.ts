import { FeeStatus, LoanStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { LoanService } from "./service";

type LoanRecord = {
  id: string;
  chamaId: string;
  borrowerId: string;
  amount: number;
  feeAmount: number;
  interest: number;
  totalDue: number;
  status: LoanStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  disbursementRef: string | null;
  dueDate: Date | null;
  repaidAt: Date | null;
  createdAt: Date;
};

type RepaymentRecord = {
  id: string;
  loanId: string;
  amount: number;
  mpesaRef: string | null;
  paidAt: Date;
};

class FakePrisma {
  loans: LoanRecord[] = [];
  repayments: RepaymentRecord[] = [];
  auditLogs: unknown[] = [];
  platformFees: Array<{ id: string; referenceId: string; status: FeeStatus; feeAmount: number }> = [];

  chamaSettings = {
    findUnique: async () => ({
      loanInterestRate: 10,
      maxLoanMultiplier: 3
    })
  };

  chamaMember = {
    findFirst: async () => ({ id: "member-1" })
  };

  loan = {
    create: async ({ data }: any): Promise<LoanRecord> => {
      const loan: LoanRecord = {
        id: `loan-${this.loans.length + 1}`,
        chamaId: data.chamaId,
        borrowerId: data.borrowerId,
        amount: data.amount,
        feeAmount: data.feeAmount ?? 0,
        interest: data.interest,
        totalDue: data.totalDue,
        status: data.status,
        approvedBy: data.approvedBy ?? null,
        approvedAt: data.approvedAt ?? null,
        disbursementRef: data.disbursementRef ?? null,
        dueDate: data.dueDate ?? null,
        repaidAt: null,
        createdAt: new Date()
      };
      this.loans.push(loan);
      return loan;
    },
    findFirst: async ({ where, include }: any): Promise<any> => {
      const loan = this.loans.find((candidate) => {
        return Object.entries(where).every(([key, value]) => {
          return candidate[key as keyof LoanRecord] === value;
        });
      });
      return loan ? this.withIncludes(loan, include) : null;
    },
    findMany: async (): Promise<LoanRecord[]> => this.loans,
    update: async ({ where, data }: any): Promise<LoanRecord> => {
      const loan = this.loans.find((candidate) => candidate.id === where.id);
      if (!loan) throw new Error("Loan not found");
      Object.assign(loan, data);
      return loan;
    }
  };

  loanRepayment = {
    create: async ({ data }: any): Promise<RepaymentRecord> => {
      const repayment: RepaymentRecord = {
        id: `repayment-${this.repayments.length + 1}`,
        loanId: data.loanId,
        amount: data.amount,
        mpesaRef: data.mpesaRef ?? null,
        paidAt: data.paidAt
      };
      this.repayments.push(repayment);
      return repayment;
    },
    update: async ({ where, data }: any): Promise<RepaymentRecord> => {
      const repayment = this.repayments.find((candidate) => candidate.id === where.id);
      if (!repayment) throw new Error("Repayment not found");
      Object.assign(repayment, data);
      return repayment;
    },
    findUnique: async ({ where, include }: any): Promise<any> => {
      const repayment = this.repayments.find((candidate) => {
        return candidate.id === where.id || candidate.mpesaRef === where.mpesaRef;
      });
      if (!repayment) return null;
      if (!include?.loan) return repayment;
      const loan = this.loans.find((candidate) => candidate.id === repayment.loanId);
      return { ...repayment, loan: this.withIncludes(loan!, include.loan.include) };
    }
  };

  auditLog = {
    create: async ({ data }: any) => {
      this.auditLogs.push(data);
      return data;
    }
  };

  platformFee = {
    create: async ({ data }: any) => {
      const fee = {
        id: `fee-${this.platformFees.length + 1}`,
        referenceId: data.referenceId,
        status: data.status ?? FeeStatus.PENDING,
        feeAmount: data.feeAmount
      };
      this.platformFees.push(fee);
      return fee;
    },
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

  private withIncludes(loan: LoanRecord, include: any) {
    return {
      ...loan,
      borrower: include?.borrower ? { id: loan.borrowerId, phone: "254712345678" } : undefined,
      repayments: include?.repayments
        ? this.repayments.filter((repayment) => repayment.loanId === loan.id)
        : undefined
    };
  }
}

function repaymentCallback(checkoutRequestId: string) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-1",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: "ok",
        CallbackMetadata: {
          Item: [{ Name: "MpesaReceiptNumber", Value: "LOANRCP1" }]
        }
      }
    }
  };
}

describe("LoanService lifecycle", () => {
  it("applies, approves, disburses, and repays a loan", async () => {
    const prisma = new FakePrisma();
    const service = new LoanService({
      prisma: prisma as any,
      checkEligibility: async () => ({ eligible: true, maxAmount: 50000 }),
      b2cTransfer: async () => ({ conversationId: "b2c-1" }),
      stkPush: async () => ({ checkoutRequestId: "stk-1" }),
      notifications: { send: async () => {} } as never
    });

    const applied = await service.apply("chama-1", "user-1", {
      amount: 10000,
      installments: 2
    });
    expect(applied.status).toBe(LoanStatus.PENDING);
    expect(applied.totalDue).toBe(11000);

    const approved = await service.approve("chama-1", "treasurer-1", applied.id, {});
    expect(approved.status).toBe(LoanStatus.APPROVED);

    const disbursed = await service.disburse("chama-1", "treasurer-1", applied.id);
    expect(disbursed.status).toBe(LoanStatus.DISBURSED);
    expect(disbursed.disbursementRef).toBe("b2c-1");
    expect(prisma.platformFees[0]).toMatchObject({ referenceId: applied.id, feeAmount: 1000 });

    const repayment = await service.repay("chama-1", "user-1", "254712345678", applied.id, {
      amount: 11000
    });
    expect(repayment.mpesaRef).toBe("stk-1");

    const callbackResult = await service.handleCallback(repaymentCallback("stk-1"));
    expect(callbackResult.processed).toBe(true);
    expect(prisma.loans[0]?.status).toBe(LoanStatus.REPAID);
    expect(prisma.platformFees.at(-1)?.status).toBe(FeeStatus.SETTLED);
    expect(prisma.auditLogs).toHaveLength(4);
  });
});
