import { ContributionStatus, InvestmentStatus, LoanStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { UpdateMeInput } from "@chama/shared";
import { prisma as defaultPrisma } from "../../lib/prisma";

type PrismaLike = Pick<
  PrismaClient,
  "user" | "chamaMember" | "contribution" | "loan" | "loanRepayment" | "investment"
>;

export class MemberError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export class MemberService {
  constructor(private readonly deps: { prisma?: PrismaLike } = {}) {}

  private get prisma(): PrismaLike {
    return this.deps.prisma ?? defaultPrisma;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new MemberError("User not found", 404);
    }

    return user;
  }

  async updateMe(userId: string, input: UpdateMeInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data: input
    });
  }

  async getMyChamas(userId: string) {
    const memberships = await this.prisma.chamaMember.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        chama: true
      },
      orderBy: { joinedAt: "desc" }
    });

    return Promise.all(
      memberships.map(async (membership) => {
        const nextContribution = await this.prisma.contribution.findFirst({
          where: {
            memberId: membership.id,
            status: ContributionStatus.PENDING
          },
          orderBy: { dueDate: "asc" }
        });

        return {
          chama: membership.chama,
          role: membership.role,
          nextContributionDue: nextContribution?.dueDate ?? null
        };
      })
    );
  }

  async getHomeSummary(userId: string) {
    const memberships = await this.prisma.chamaMember.findMany({
      where: { userId, isActive: true },
      include: {
        chama: {
          include: {
            members: {
              where: { isActive: true },
              select: { id: true }
            },
            settings: true
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });

    const chamaIds = memberships.map((membership) => membership.chamaId);
    const memberIds = memberships.map((membership) => membership.id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      paidContributionsByChama,
      disbursedLoansByChama,
      nextContribution,
      monthlySaved,
      activeLoans,
      investments,
      recentContributions,
      recentRepayments
    ] = await Promise.all([
      this.prisma.contribution.groupBy({
        by: ["chamaId"],
        where: { chamaId: { in: chamaIds }, status: ContributionStatus.PAID },
        _sum: { amount: true }
      }),
      this.prisma.loan.groupBy({
        by: ["chamaId"],
        where: {
          chamaId: { in: chamaIds },
          status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID] }
        },
        _sum: { amount: true }
      }),
      this.prisma.contribution.findFirst({
        where: {
          memberId: { in: memberIds },
          status: { in: [ContributionStatus.PENDING, ContributionStatus.LATE] }
        },
        orderBy: { dueDate: "asc" },
        include: { chama: true }
      }),
      this.prisma.contribution.aggregate({
        where: {
          memberId: { in: memberIds },
          status: ContributionStatus.PAID,
          paidAt: { gte: monthStart }
        },
        _sum: { amount: true }
      }),
      this.prisma.loan.findMany({
        where: {
          borrowerId: userId,
          status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID] }
        },
        include: { repayments: true, chama: true },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.investment.findMany({
        where: {
          chamaId: { in: chamaIds },
          status: { in: [InvestmentStatus.ACTIVE, InvestmentStatus.MATURED] }
        },
        select: { amount: true, currentValue: true }
      }),
      this.prisma.contribution.findMany({
        where: { memberId: { in: memberIds } },
        include: { chama: true },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      this.prisma.loanRepayment.findMany({
        where: { loan: { borrowerId: userId } },
        include: { loan: { include: { chama: true } } },
        orderBy: { paidAt: "desc" },
        take: 5
      })
    ]);

    const paidByChama = new Map(
      paidContributionsByChama.map((item) => [item.chamaId, item._sum.amount ?? 0])
    );
    const disbursedByChama = new Map(
      disbursedLoansByChama.map((item) => [item.chamaId, item._sum.amount ?? 0])
    );
    const chamas = memberships.map((membership) => {
      const poolBalance =
        (paidByChama.get(membership.chamaId) ?? 0) - (disbursedByChama.get(membership.chamaId) ?? 0);
      const contributionAmount = membership.chama.settings?.contributionAmount ?? 0;
      const cycleTarget = contributionAmount * Math.max(membership.chama.members.length, 1);
      const cycleProgress = cycleTarget > 0 ? Math.min(poolBalance / cycleTarget, 1) : 0;

      return {
        chama: {
          ...membership.chama,
          members: membership.chama.members,
          poolBalance
        },
        role: membership.role,
        nextContributionDue:
          membership.id === nextContribution?.memberId ? nextContribution.dueDate : null,
        memberCount: membership.chama.members.length,
        cycleProgress,
        cycleTarget,
        nextPayoutLabel:
          membership.chama.type === "MERRY_GO_ROUND"
            ? "Next payout pending"
            : membership.chama.type === "TABLE_BANKING"
              ? "Loan pool active"
              : "Portfolio growing"
      };
    });
    const chamaBalance = chamas.reduce((sum, item) => sum + (item.chama.poolBalance ?? 0), 0);
    const activeLoanOutstanding = activeLoans.reduce((sum, loan) => {
      const repaid = loan.repayments.reduce((innerSum, repayment) => innerSum + repayment.amount, 0);
      return sum + Math.max(loan.totalDue - repaid, 0);
    }, 0);
    const amountInvested = investments.reduce((sum, item) => sum + item.amount, 0);
    const currentInvestmentValue = investments.reduce((sum, item) => sum + item.currentValue, 0);
    const investmentReturnPct =
      amountInvested > 0
        ? Number((((currentInvestmentValue - amountInvested) / amountInvested) * 100).toFixed(1))
        : 0;

    const contributionActivities = recentContributions.map((contribution) => ({
      id: contribution.id,
      title:
        contribution.status === ContributionStatus.PAID
          ? "Contribution paid"
          : contribution.status === ContributionStatus.LATE
            ? "Contribution overdue"
            : "Contribution scheduled",
      source: contribution.chama.name,
      date: (contribution.paidAt ?? contribution.createdAt).toISOString(),
      amount: -contribution.amount,
      direction: "expense" as const
    }));
    const repaymentActivities = recentRepayments.map((repayment) => ({
      id: repayment.id,
      title: "Loan repayment",
      source: repayment.loan.chama.name,
      date: repayment.paidAt.toISOString(),
      amount: -repayment.amount,
      direction: "expense" as const
    }));
    const recentActivity = [...contributionActivities, ...repaymentActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      poolBalance: chamaBalance,
      chamaBalance,
      totalBalance: chamaBalance,
      nextAction: nextContribution
        ? {
            type: "CONTRIBUTION",
            chamaId: nextContribution.chamaId,
            chamaName: nextContribution.chama.name,
            amount: nextContribution.amount,
            dueDate: nextContribution.dueDate.toISOString(),
            title: `${nextContribution.chama.name} contribution`
          }
        : null,
      chamas,
      insights: {
        monthlySaved: monthlySaved._sum.amount ?? 0,
        activeLoan: activeLoanOutstanding,
        investmentReturnPct
      },
      recentActivity
    };
  }

  async getMyContributions(userId: string, pagination: PaginationInput) {
    return this.prisma.contribution.findMany({
      where: {
        member: {
          userId
        }
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: {
        chama: true
      }
    });
  }

  async getMyLoans(userId: string, pagination: PaginationInput) {
    return this.prisma.loan.findMany({
      where: { borrowerId: userId },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
      include: {
        chama: true
      }
    });
  }
}

export type PaginationInput = {
  skip: number;
  take: number;
};
