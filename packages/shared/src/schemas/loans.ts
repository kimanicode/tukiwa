import { z } from "zod";

export const applyLoanSchema = z.object({
  amount: z.number().int().positive(),
  installments: z.number().int().min(1).max(60).default(1)
});

export const approveLoanSchema = z.object({
  dueDate: z.string().datetime().optional()
});

export const repayLoanSchema = z.object({
  amount: z.number().int().positive()
});

export const loanFiltersSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "APPROVED",
      "REJECTED",
      "DISBURSED",
      "PARTIALLY_REPAID",
      "REPAID",
      "DEFAULTED"
    ])
    .optional(),
  memberId: z.string().optional()
});

export type ApplyLoanInput = z.infer<typeof applyLoanSchema>;
export type ApproveLoanInput = z.infer<typeof approveLoanSchema>;
export type RepayLoanInput = z.infer<typeof repayLoanSchema>;
export type LoanFiltersInput = z.infer<typeof loanFiltersSchema>;
