import { randomUUID } from "crypto";
import { ChamaType, ContributionStatus, Cycle, FeeStatus, LoanStatus, MemberRole, Prisma, RotationStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type {
  CreateChamaInput,
  GovernanceSettingsInput,
  InviteMemberInput,
  UpdateChamaSettingsInput,
  UpdateChamaInput,
  UpdateMemberRoleInput
} from "@chama/shared";
import { sendSms as defaultSendSms } from "../../lib/sms";
import { prisma as defaultPrisma } from "../../lib/prisma";
import { generateAccountRef } from "../../lib/mpesa/account-ref";
import { normalizeKenyanPhone } from "../auth/service";

type PrismaLike = Pick<
  PrismaClient,
  | "chama"
  | "chamaSettings"
  | "chamaMember"
  | "user"
  | "auditLog"
  | "contribution"
  | "loan"
  | "loanRepayment"
  | "platformFee"
  | "rotation"
  | "investment"
  | "$transaction"
>;

const GOVERNANCE_DEFAULTS = {
  votingRule: "simple_majority",
  withdrawalPolicy: "Withdrawals require treasurer approval.",
  memberExitPolicy:
    "A member may exit with 30 days notice. Outstanding loans must be cleared before exit.",
  refundPolicy:
    "Contributions are non-refundable once pooled. Exit payouts are calculated at the end of the current contribution cycle.",
  disputeResolutionMethod:
    "Disputes are first handled internally by the admin. Unresolved disputes are escalated to a member vote.",
  meetingFrequency: "monthly",
  recordVisibility: "members_see_own_records"
} as const;

export class ChamaError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export class ChamaService {
  constructor(
    private readonly deps: {
      prisma?: PrismaLike;
      sendSms?: (phone: string, message: string) => Promise<void>;
    } = {}
  ) {}

  private get prisma(): PrismaLike {
    return this.deps.prisma ?? defaultPrisma;
  }

  private get sendSms(): (phone: string, message: string) => Promise<void> {
    return this.deps.sendSms ?? defaultSendSms;
  }

  async createChama(actorId: string, input: CreateChamaInput) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const chamaId = randomUUID();
      const mpesaAccountRef = generateAccountRef(input.name, chamaId);
      try {
        return await this.prisma.$transaction(async (tx) => {
          const chama = await tx.chama.create({
            data: {
              id: chamaId,
              name: input.name,
              type: input.type as ChamaType,
              mpesaAccountRef,
              description: input.description,
              logoUrl: input.logoUrl
            }
          });

          await tx.chamaSettings.create({
            data: {
              chamaId: chama.id,
              contributionAmount: 0,
              contributionCycle: Cycle.MONTHLY,
              loanInterestRate: 0,
              maxLoanMultiplier: 3,
              penaltyRate: 0,
              requiresMeetingForLoan: true,
              ...GOVERNANCE_DEFAULTS
            }
          });

          await tx.chamaMember.create({
            data: {
              chamaId: chama.id,
              userId: actorId,
              role: MemberRole.ADMIN
            }
          });

          await tx.auditLog.create({
            data: {
              chamaId: chama.id,
              actorId,
              action: "CHAMA_CREATED",
              entity: "Chama",
              entityId: chama.id,
              meta: { name: chama.name, type: chama.type }
            }
          });

          return chama;
        });
      } catch (error) {
        if (isUniqueConstraintError(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    throw new ChamaError("Could not generate unique M-Pesa account reference", 500);
  }

  async getChamaDetail(chamaId: string, actorId: string) {
    await this.assertActiveMember(chamaId, actorId);

    const [chama, paidContributions, disbursedLoans] = await Promise.all([
      this.prisma.chama.findUnique({
        where: { id: chamaId },
        include: {
          settings: true,
          members: {
            where: { isActive: true },
            include: { user: true },
            orderBy: { joinedAt: "asc" }
          }
        }
      }),
      this.prisma.contribution.aggregate({
        where: {
          chamaId,
          status: ContributionStatus.PAID
        },
        _sum: { amount: true }
      }),
      this.prisma.loan.aggregate({
        where: {
          chamaId,
          status: LoanStatus.DISBURSED
        },
        _sum: { amount: true }
      })
    ]);

    if (!chama) {
      throw new ChamaError("Chama not found", 404);
    }

    return {
      ...chama,
      // Pool balance intentionally uses member-facing principal amounts only.
      // Platform fees live in PlatformFee and are excluded from chama funds.
      poolBalance:
        (paidContributions._sum.amount ?? 0) - (disbursedLoans._sum.amount ?? 0)
    };
  }

  async getFundsSummary(chamaId: string, actorId: string) {
    await this.assertActiveMember(chamaId, actorId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cycleStart = monthStart;

    const [
      chama,
      paidContributions,
      activeDisbursedLoans,
      allDisbursedLoans,
      repaidLoans,
      splitFees,
      splitFeesThisMonth,
      currentCyclePaid,
      activeMembers,
      settings,
      recentContributions,
      recentLoans,
      recentRepayments,
      recentRotations,
      recentInvestments,
      outstandingLoans
    ] = await Promise.all([
      this.prisma.chama.findUnique({
        where: { id: chamaId },
        select: { id: true, name: true, mpesaAccountRef: true }
      }),
      this.prisma.contribution.aggregate({
        where: { chamaId, status: ContributionStatus.PAID },
        _sum: { amount: true }
      }),
      this.prisma.loan.aggregate({
        where: {
          chamaId,
          status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID] }
        },
        _sum: { amount: true }
      }),
      this.prisma.loan.aggregate({
        where: {
          chamaId,
          status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID, LoanStatus.REPAID] }
        },
        _sum: { amount: true }
      }),
      this.prisma.loanRepayment.aggregate({
        where: { loan: { chamaId } },
        _sum: { amount: true }
      }),
      this.prisma.platformFee.aggregate({
        where: { chamaId, status: FeeStatus.SPLIT },
        _sum: { feeAmount: true }
      }),
      this.prisma.platformFee.aggregate({
        where: { chamaId, status: FeeStatus.SPLIT, createdAt: { gte: monthStart } },
        _sum: { feeAmount: true }
      }),
      this.prisma.contribution.aggregate({
        where: {
          chamaId,
          status: ContributionStatus.PAID,
          paidAt: { gte: cycleStart }
        },
        _sum: { amount: true }
      }),
      this.prisma.chamaMember.count({ where: { chamaId, isActive: true } }),
      this.prisma.chamaSettings.findUnique({ where: { chamaId } }),
      this.prisma.contribution.findMany({
        where: { chamaId, status: ContributionStatus.PAID },
        include: { member: { include: { user: true } } },
        orderBy: { paidAt: "desc" },
        take: 20
      }),
      this.prisma.loan.findMany({
        where: { chamaId, status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID, LoanStatus.REPAID] } },
        include: { borrower: true },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      this.prisma.loanRepayment.findMany({
        where: { loan: { chamaId } },
        include: { loan: { include: { borrower: true } } },
        orderBy: { paidAt: "desc" },
        take: 20
      }),
      this.prisma.rotation.findMany({
        where: { chamaId, status: RotationStatus.PAID },
        include: { member: { include: { user: true } } },
        orderBy: { paidAt: "desc" },
        take: 20
      }),
      this.prisma.investment.findMany({
        where: { chamaId },
        orderBy: { startedAt: "desc" },
        take: 20
      }),
      this.prisma.loan.findMany({
        where: {
          chamaId,
          status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID] }
        },
        include: { repayments: true }
      })
    ]);

    if (!chama) {
      throw new ChamaError("Chama not found", 404);
    }

    const totalContributed = paidContributions._sum.amount ?? 0;
    const balanceDisbursed = activeDisbursedLoans._sum.amount ?? 0;
    const totalDisbursed = allDisbursedLoans._sum.amount ?? 0;
    const totalRepaid = repaidLoans._sum.amount ?? 0;
    const expected = (settings?.contributionAmount ?? 0) * activeMembers;
    const collected = currentCyclePaid._sum.amount ?? 0;
    const outstandingTotal = outstandingLoans.reduce((sum, loan) => {
      const repaid = loan.repayments.reduce((inner, repayment) => inner + repayment.amount, 0);
      return sum + Math.max(loan.totalDue - repaid, 0);
    }, 0);

    const recentTransactions = [
      ...recentContributions.map((contribution) => ({
        id: contribution.id,
        type: "CONTRIBUTION" as const,
        description: `${contribution.member?.user.fullName ?? "Member"} contribution`,
        amount: contribution.amount,
        memberName: contribution.member?.user.fullName ?? "Unknown member",
        mpesaRef: contribution.mpesaReceiptNum,
        createdAt: (contribution.paidAt ?? contribution.createdAt).toISOString()
      })),
      ...recentLoans.map((loan) => ({
        id: loan.id,
        type: "LOAN_DISBURSEMENT" as const,
        description: `${loan.borrower.fullName} loan disbursement`,
        amount: -loan.amount,
        memberName: loan.borrower.fullName,
        mpesaRef: loan.disbursementRef,
        createdAt: loan.createdAt.toISOString()
      })),
      ...recentRepayments.map((repayment) => ({
        id: repayment.id,
        type: "LOAN_REPAYMENT" as const,
        description: `${repayment.loan.borrower.fullName} loan repayment`,
        amount: repayment.amount,
        memberName: repayment.loan.borrower.fullName,
        mpesaRef: repayment.mpesaRef,
        createdAt: repayment.paidAt.toISOString()
      })),
      ...recentRotations.map((rotation) => ({
        id: rotation.id,
        type: "ROTATION_PAYOUT" as const,
        description: `${rotation.member.user.fullName} rotation payout`,
        amount: -rotation.amount,
        memberName: rotation.member.user.fullName,
        mpesaRef: null,
        createdAt: (rotation.paidAt ?? rotation.scheduledAt).toISOString()
      })),
      ...recentInvestments.map((investment) => ({
        id: investment.id,
        type: "INVESTMENT_PURCHASE" as const,
        description: `${investment.name} investment purchase`,
        amount: -investment.amount,
        memberName: "Chama",
        mpesaRef: null,
        createdAt: investment.startedAt.toISOString()
      }))
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return {
      chama: {
        ...chama,
        paybillNumber: process.env.MPESA_SHORTCODE ?? ""
      },
      pool: {
        balance: totalContributed - balanceDisbursed,
        totalContributed,
        totalDisbursed,
        totalRepaid,
        totalFeesPaid: splitFees._sum.feeAmount ?? 0
      },
      currentCycle: {
        collected,
        expected,
        collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0
      },
      recentTransactions,
      outstandingLoans: {
        count: outstandingLoans.length,
        totalOutstanding: outstandingTotal
      },
      platformFees: {
        totalThisMonth: splitFeesThisMonth._sum.feeAmount ?? 0,
        totalAllTime: splitFees._sum.feeAmount ?? 0,
        rateApplied: "0.8% on contributions"
      }
    };
  }

  async updateChama(chamaId: string, actorId: string, input: UpdateChamaInput) {
    const chama = await this.prisma.chama.update({
      where: { id: chamaId },
      data: input
    });

    await this.prisma.auditLog.create({
      data: {
        chamaId,
        actorId,
        action: "CHAMA_UPDATED",
        entity: "Chama",
        entityId: chamaId,
        meta: input
      }
    });

    return chama;
  }

  async updateChamaSettings(
    chamaId: string,
    actorId: string,
    input: UpdateChamaSettingsInput
  ) {
    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.chamaSettings.update({
        where: { chamaId },
        data: {
          ...input,
          ...(input.contributionCycle
            ? { contributionCycle: input.contributionCycle as Cycle }
            : {})
        }
      });

      await tx.auditLog.create({
        data: {
          chamaId,
          actorId,
          action: "CHAMA_SETTINGS_UPDATED",
          entity: "ChamaSettings",
          entityId: settings.id,
          meta: input
        }
      });

      return settings;
    });
  }

  async updateGovernanceSettings(
    chamaId: string,
    actorId: string,
    input: GovernanceSettingsInput
  ) {
    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.chamaSettings.update({
        where: { chamaId },
        data: input
      });

      await tx.auditLog.create({
        data: {
          chamaId,
          actorId,
          action: "GOVERNANCE_UPDATED",
          entity: "chama_settings",
          entityId: chamaId,
          meta: { changedFields: Object.keys(input) }
        }
      });

      return settings;
    });
  }

  async inviteMember(chamaId: string, actorId: string, input: InviteMemberInput) {
    const phone = normalizeKenyanPhone(input.phone);
    const chama = await this.prisma.chama.findUnique({ where: { id: chamaId } });
    if (!chama) {
      throw new ChamaError("Chama not found", 404);
    }

    const { member, user, wasExistingUser } = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { phone } });
      const user = await tx.user.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          fullName: phone
        }
      });

      const member = await tx.chamaMember.upsert({
        where: {
          chamaId_userId: {
            chamaId,
            userId: user.id
          }
        },
        update: {
          isActive: true,
          role: MemberRole.MEMBER
        },
        create: {
          chamaId,
          userId: user.id,
          role: MemberRole.MEMBER
        }
      });

      await tx.auditLog.create({
        data: {
          chamaId,
          actorId,
          action: "MEMBER_INVITED",
          entity: "ChamaMember",
          entityId: member.id,
          meta: { phone, userId: user.id }
        }
      });

      return { member, user, wasExistingUser: Boolean(existingUser) };
    });

    await this.sendSms(
      phone,
      `You have been invited to join ${chama.name} on Tukiwa.`
    );

    return { member, user, wasExistingUser };
  }

  async removeMember(chamaId: string, memberId: string, actorId: string) {
    const member = await this.prisma.chamaMember.update({
      where: { id: memberId },
      data: { isActive: false }
    });

    await this.prisma.auditLog.create({
      data: {
        chamaId,
        actorId,
        action: "MEMBER_REMOVED",
        entity: "ChamaMember",
        entityId: memberId,
        meta: { userId: member.userId }
      }
    });

    return member;
  }

  async changeMemberRole(
    chamaId: string,
    memberId: string,
    actorId: string,
    input: UpdateMemberRoleInput
  ) {
    const member = await this.prisma.chamaMember.findFirst({
      where: {
        id: memberId,
        chamaId,
        isActive: true
      }
    });

    if (!member) {
      throw new ChamaError("Member not found", 404);
    }

    if (member.role === MemberRole.ADMIN && input.role !== MemberRole.ADMIN) {
      const adminCount = await this.prisma.chamaMember.count({
        where: {
          chamaId,
          role: MemberRole.ADMIN,
          isActive: true
        }
      });

      if (adminCount <= 1) {
        throw new ChamaError("Cannot demote the last ADMIN", 400);
      }
    }

    const updated = await this.prisma.chamaMember.update({
      where: { id: memberId },
      data: { role: input.role as MemberRole }
    });

    await this.prisma.auditLog.create({
      data: {
        chamaId,
        actorId,
        action: "MEMBER_ROLE_CHANGED",
        entity: "ChamaMember",
        entityId: memberId,
        meta: { from: member.role, to: updated.role }
      }
    });

    return updated;
  }

  private async assertActiveMember(chamaId: string, userId: string): Promise<void> {
    const member = await this.prisma.chamaMember.findFirst({
      where: {
        chamaId,
        userId,
        isActive: true
      },
      select: { id: true }
    });

    if (!member) {
      throw new ChamaError("Chama not found", 404);
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
