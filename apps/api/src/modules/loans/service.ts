import { FeeStatus, FeeTransactionType, LoanStatus, MemberRole, ProposalType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import type {
  ApplyLoanInput,
  ApproveLoanInput,
  LoanFiltersInput,
  RepayLoanInput
} from "@chama/shared";
import { prisma as defaultPrisma } from "../../lib/prisma";
import {
  b2cTransfer as defaultB2cTransfer,
  stkPush as defaultStkPush,
  validateCallback
} from "../../lib/mpesa";
import { isValidAccountRef } from "../../lib/mpesa/account-ref";
import { checkLoanEligibility } from "./eligibility.service";
import { generateRepaymentSchedule } from "./schedule";
import { Channel, NotificationEvent, NotificationService } from "../notifications";
import { calculateFee, createFeeRecord, settleFee, voidFee } from "../fees/fee.service";
import { createProposal, shouldRequireProposal } from "../treasury/proposal.service";

type PrismaLike = Pick<
  PrismaClient,
  | "loan"
  | "loanRepayment"
  | "chama"
  | "chamaMember"
  | "chamaSettings"
  | "auditLog"
  | "platformFee"
  | "$transaction"
>;

export class LoanError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export class LoanService {
  constructor(
    private readonly deps: {
      prisma?: PrismaLike;
      b2cTransfer?: (phone: string, amount: number, remarks: string) => Promise<{ conversationId: string }>;
      stkPush?: (phone: string, amount: number, accountRef: string, description: string) => Promise<{ checkoutRequestId: string }>;
      checkEligibility?: typeof checkLoanEligibility;
      notifications?: NotificationService;
    } = {}
  ) {}

  private get prisma(): PrismaLike {
    return this.deps.prisma ?? defaultPrisma;
  }

  async apply(chamaId: string, userId: string, input: ApplyLoanInput) {
    const eligibility = await (this.deps.checkEligibility ?? checkLoanEligibility)(
      userId,
      chamaId,
      input.amount,
      { prisma: this.prisma as never }
    );
    if (!eligibility.eligible) {
      throw new LoanError(eligibility.reason ?? "Not eligible", 400);
    }

    const settings = await this.prisma.chamaSettings.findUnique({ where: { chamaId } });
    const interestRate = settings?.loanInterestRate ?? 0;
    const interest = new Decimal(input.amount).mul(interestRate).div(100).round().toNumber();
    const totalDue = new Decimal(input.amount).plus(interest).toNumber();
    const schedule = generateRepaymentSchedule(input.amount, interestRate, input.installments);

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          chamaId,
          borrowerId: userId,
          amount: input.amount,
          interest,
          totalDue,
          status: LoanStatus.PENDING,
          dueDate: schedule.at(-1)?.dueDate
        }
      });

      await tx.auditLog.create({
        data: {
          chamaId,
          actorId: userId,
          action: "LOAN_APPLIED",
          entity: "Loan",
          entityId: loan.id,
          meta: { amount: input.amount, installments: input.installments, schedule }
        }
      });

      return { ...loan, schedule };
    });
  }

  async list(chamaId: string, userId: string, filters: LoanFiltersInput) {
    await this.assertMember(chamaId, userId);
    return this.prisma.loan.findMany({
      where: {
        chamaId,
        status: filters.status as LoanStatus | undefined,
        borrowerId: filters.memberId
      },
      include: { repayments: true, borrower: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async detail(chamaId: string, userId: string, loanId: string) {
    await this.assertMember(chamaId, userId);
    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, chamaId },
      include: { repayments: true, borrower: true }
    });
    if (!loan) throw new LoanError("Loan not found", 404);
    const repaid = loan.repayments.reduce((sum, repayment) => sum + repayment.amount, 0);
    return { ...loan, outstandingBalance: Math.max(loan.totalDue - repaid, 0) };
  }

  async approve(chamaId: string, actorId: string, loanId: string, input: ApproveLoanInput) {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, chamaId } });
    if (!loan) throw new LoanError("Loan not found", 404);
    if (loan.status !== LoanStatus.PENDING) throw new LoanError("Loan is not pending", 400);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.APPROVED,
          approvedBy: actorId,
          approvedAt: new Date(),
          dueDate: input.dueDate ? new Date(input.dueDate) : loan.dueDate
        }
      });
      await tx.auditLog.create({
        data: { chamaId, actorId, action: "LOAN_APPROVED", entity: "Loan", entityId: loanId }
      });
      this.notify(
        loan.borrowerId,
        NotificationEvent.LOAN_APPROVED,
        { chamaId, loanId, amount: loan.amount },
        [Channel.WEBSOCKET, Channel.PUSH, Channel.SMS, Channel.WHATSAPP]
      );
      return updated;
    });
  }

  async disburse(chamaId: string, actorId: string, loanId: string): Promise<any> {
    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, chamaId },
      include: { borrower: true }
    });
    if (!loan) throw new LoanError("Loan not found", 404);
    if (loan.status !== LoanStatus.APPROVED) throw new LoanError("Loan is not approved", 400);

    if (await shouldRequireProposal(chamaId, loan.amount)) {
      const proposal = await createProposal(defaultPrisma, {
        chamaId,
        proposedBy: actorId,
        type: ProposalType.LOAN_DISBURSEMENT,
        referenceId: loan.id,
        referenceType: "loan_disbursement",
        amount: loan.amount,
        recipientPhone: loan.borrower.phone,
        recipientName: loan.borrower.fullName,
        description: `Loan disbursement to ${loan.borrower.fullName}`
      });

      await this.prisma.loan.update({
        where: { id: loanId },
        data: { status: LoanStatus.PENDING_APPROVAL }
      });

      await this.prisma.auditLog.create({
        data: {
          chamaId,
          actorId,
          action: "LOAN_DISBURSEMENT_PROPOSAL_CREATED",
          entity: "Loan",
          entityId: loanId,
          meta: { proposalId: proposal.id }
        }
      });

      return { requiresApproval: true, proposal };
    }

    const fee = calculateFee(FeeTransactionType.LOAN_DISBURSEMENT, loan.amount);

    await this.prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id: loanId },
        data: { feeAmount: fee.feeAmount }
      });
      await createFeeRecord(tx, {
        type: FeeTransactionType.LOAN_DISBURSEMENT,
        referenceId: loan.id,
        referenceType: "loan",
        grossAmount: loan.amount,
        feeAmount: fee.feeAmount,
        netAmount: fee.netAmount,
        feeRate: fee.feeRate,
        chamaId,
        memberId: loan.borrowerId
      });
    });

    let conversationId: string;
    try {
      const result = await (this.deps.b2cTransfer ?? defaultB2cTransfer)(
        loan.borrower.phone,
        centsToKes(fee.netAmount),
        "Tukiwa loan disbursement"
      );
      conversationId = result.conversationId;
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await voidFee(tx, loan.id);
      });
      throw error;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: { status: LoanStatus.DISBURSED, disbursementRef: conversationId }
      });
      await tx.auditLog.create({
        data: {
          chamaId,
          actorId,
          action: "LOAN_DISBURSED",
          entity: "Loan",
          entityId: loanId,
          meta: { conversationId, feeAmount: fee.feeAmount, netAmount: fee.netAmount }
        }
      });
      this.notify(
        loan.borrowerId,
        NotificationEvent.LOAN_DISBURSED,
        { chamaId, loanId, amount: loan.amount },
        [Channel.WEBSOCKET, Channel.PUSH, Channel.SMS]
      );
      return updated;
    });
  }

  async repay(chamaId: string, userId: string, phone: string, loanId: string, input: RepayLoanInput) {
    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, chamaId } });
    if (!loan) throw new LoanError("Loan not found", 404);
    if (
      loan.status !== LoanStatus.DISBURSED &&
      loan.status !== LoanStatus.PARTIALLY_REPAID
    ) {
      throw new LoanError("Loan is not repayable", 400);
    }
    if (loan.borrowerId !== userId) throw new LoanError("Forbidden", 403);

    const fee = calculateFee(FeeTransactionType.LOAN_REPAYMENT, input.amount);
    const chama = await this.prisma.chama.findUnique({
      where: { id: chamaId },
      select: { name: true, mpesaAccountRef: true }
    });
    if (!chama?.mpesaAccountRef || !isValidAccountRef(chama.mpesaAccountRef)) {
      throw new LoanError("Chama has no valid M-Pesa account reference", 400);
    }

    const repayment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.loanRepayment.create({
        data: { loanId, amount: input.amount, paidAt: new Date() }
      });
      await createFeeRecord(tx, {
        type: FeeTransactionType.LOAN_REPAYMENT,
        referenceId: created.id,
        referenceType: "loan_repayment",
        grossAmount: input.amount,
        feeAmount: fee.feeAmount,
        netAmount: fee.netAmount,
        feeRate: fee.feeRate,
        chamaId,
        memberId: userId,
        status: FeeStatus.SPLIT
      });
      return created;
    });
    try {
      const { checkoutRequestId } = await (this.deps.stkPush ?? defaultStkPush)(
        phone,
        centsToKes(input.amount),
        chama.mpesaAccountRef,
        `${chama.name} loan repayment`
      );

      return this.prisma.loanRepayment.update({
        where: { id: repayment.id },
        data: { mpesaRef: checkoutRequestId }
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await voidFee(tx, repayment.id);
      });
      throw error;
    }
  }

  async handleCallback(payload: unknown) {
    const callback = validateCallback(payload);
    const repayment = await this.prisma.loanRepayment.findUnique({
      where: { mpesaRef: callback.checkoutRequestId },
      include: { loan: { include: { repayments: true } } }
    });

    if (!repayment) {
      return { processed: false };
    }

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.loanRepayment.findUnique({
        where: { id: repayment.id },
        include: { loan: { include: { repayments: true } } }
      });
      if (!fresh) return { processed: false };

      if (callback.resultCode !== 0) {
        await voidFee(tx, fresh.id);
        return { processed: false };
      }

      const repaid = fresh.loan.repayments.reduce((sum, item) => sum + item.amount, 0);
      const status = repaid >= fresh.loan.totalDue ? LoanStatus.REPAID : LoanStatus.PARTIALLY_REPAID;
      const updatedLoan = await tx.loan.update({
        where: { id: fresh.loanId },
        data: {
          status,
          repaidAt: status === LoanStatus.REPAID ? new Date() : null
        }
      });
      await tx.auditLog.create({
        data: {
          chamaId: fresh.loan.chamaId,
          action: "LOAN_REPAYMENT_CONFIRMED",
          entity: "LoanRepayment",
          entityId: fresh.id,
          meta: { checkoutRequestId: callback.checkoutRequestId, receiptNumber: callback.receiptNumber }
        }
      });
      await settleFee(tx, fresh.id);
      return { processed: true, loan: updatedLoan };
    });
  }

  private async assertMember(chamaId: string, userId: string) {
    const member = await this.prisma.chamaMember.findFirst({ where: { chamaId, userId, isActive: true } });
    if (!member) throw new LoanError("Chama not found", 404);
  }

  private notify(
    userId: string,
    event: NotificationEvent,
    data: Record<string, unknown>,
    channels: Channel[]
  ): void {
    void (this.deps.notifications ?? new NotificationService({ prisma: this.prisma as never }))
      .send(userId, event, data, channels)
      .catch((error) => console.warn("Loan notification failed", error));
  }
}

export const loanApproverRoles = [MemberRole.ADMIN, MemberRole.TREASURER] as const;

function centsToKes(amountInCents: number): number {
  return Math.ceil(amountInCents / 100);
}
