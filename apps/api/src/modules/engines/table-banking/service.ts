import { ContributionStatus, LoanStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "../../../lib/prisma";
import { LoanService } from "../../loans/service";
import { checkLoanEligibility } from "../../loans/eligibility.service";

export class TableBankingError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export class TableBankingService {
  constructor(private readonly deps: { prisma?: any; loanService?: LoanService; checkEligibility?: typeof checkLoanEligibility } = {}) {}

  private get prisma() {
    return this.deps.prisma ?? defaultPrisma;
  }

  async createMeeting(chamaId: string, title: string, heldAt = new Date(), minutes?: string) {
    return this.prisma.meeting.create({ data: { chamaId, title, heldAt, minutes } });
  }

  async listMeetings(chamaId: string) {
    return this.prisma.meeting.findMany({ where: { chamaId }, orderBy: { heldAt: "desc" } });
  }

  async pool(chamaId: string) {
    const [contributed, disbursed, repaid, outstanding] = await Promise.all([
      this.prisma.contribution.aggregate({ where: { chamaId, status: ContributionStatus.PAID }, _sum: { amount: true } }),
      this.prisma.loan.aggregate({ where: { chamaId, status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID, LoanStatus.REPAID] } }, _sum: { amount: true } }),
      this.prisma.loanRepayment.aggregate({ where: { loan: { chamaId } }, _sum: { amount: true } }),
      this.prisma.loan.aggregate({ where: { chamaId, status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID] } }, _sum: { totalDue: true } })
    ]);
    const totalContributed = contributed._sum.amount ?? 0;
    const totalDisbursed = disbursed._sum.amount ?? 0;
    const totalRepaid = repaid._sum.amount ?? 0;
    const totalOutstandingLoans = Math.max((outstanding._sum.totalDue ?? 0) - totalRepaid, 0);
    return {
      totalContributed,
      totalDisbursed,
      totalRepaid,
      availableBalance: totalContributed + totalRepaid - totalDisbursed,
      totalOutstandingLoans
    };
  }

  async instantLoan(chamaId: string, actorId: string, amount: number, installments = 1) {
    const eligibility = await (this.deps.checkEligibility ?? checkLoanEligibility)(actorId, chamaId, amount, { prisma: this.prisma });
    if (!eligibility.eligible) return { approved: false, reason: eligibility.reason };
    const pool = await this.pool(chamaId);
    if (pool.availableBalance < amount) return { approved: false, reason: "Pool balance insufficient" };
    const loanService = this.deps.loanService ?? new LoanService({ prisma: this.prisma });
    const loan = await loanService.apply(chamaId, actorId, { amount, installments });
    const approved = await loanService.approve(chamaId, actorId, loan.id, {});
    const disbursed = await loanService.disburse(chamaId, actorId, approved.id);
    return { approved: true, loan: disbursed };
  }
}
