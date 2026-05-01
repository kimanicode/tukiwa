import { ContributionStatus, FeeTransactionType, LoanStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type {
  ContributionFiltersInput,
  InitiateContributionInput
} from "@chama/shared";
import { prisma as defaultPrisma } from "../../lib/prisma";
import { stkPush as defaultStkPush } from "../../lib/mpesa";
import { normalizeKenyanPhone } from "../auth/service";
import { calculateFee, createFeeRecord, voidFee } from "../fees/fee.service";

type PrismaLike = Pick<
  PrismaClient,
  "chamaMember" | "contribution" | "loan" | "auditLog" | "platformFee" | "$transaction"
>;

export class ContributionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export class ContributionService {
  constructor(
    private readonly deps: {
      prisma?: PrismaLike;
      stkPush?: (
        phone: string,
        amount: number,
        accountRef: string,
        description: string
      ) => Promise<{ checkoutRequestId: string }>;
    } = {}
  ) {}

  private get prisma(): PrismaLike {
    return this.deps.prisma ?? defaultPrisma;
  }

  private get stkPush() {
    return this.deps.stkPush ?? defaultStkPush;
  }

  async initiate(chamaId: string, userId: string, phone: string, input: InitiateContributionInput) {
    const member = await this.prisma.chamaMember.findFirst({
      where: {
        chamaId,
        userId,
        isActive: true
      }
    });

    if (!member) {
      throw new ContributionError("Chama not found", 404);
    }

    const normalizedPhone = normalizeKenyanPhone(phone);
    const dueDate = input.dueDate ? new Date(input.dueDate) : new Date();

    const fee = calculateFee(FeeTransactionType.CONTRIBUTION, input.amount);
    const chargeAmount = input.amount + fee.feeAmount;

    const contribution = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contribution.create({
        data: {
          chamaId,
          memberId: member.id,
          amount: input.amount,
          feeAmount: fee.feeAmount,
          status: ContributionStatus.PENDING,
          dueDate
        }
      });

      await createFeeRecord(tx, {
        type: FeeTransactionType.CONTRIBUTION,
        referenceId: created.id,
        referenceType: "contribution",
        grossAmount: input.amount,
        feeAmount: fee.feeAmount,
        netAmount: fee.netAmount,
        feeRate: fee.feeRate,
        chamaId,
        memberId: member.id
      });

      return created;
    });

    try {
      const { checkoutRequestId } = await this.stkPush(
        normalizedPhone,
        centsToKes(chargeAmount),
        contribution.id,
        "Tukiwa contribution"
      );

      return this.prisma.contribution.update({
        where: { id: contribution.id },
        data: { mpesaRef: checkoutRequestId }
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await tx.contribution.update({
          where: { id: contribution.id },
          data: { status: ContributionStatus.LATE }
        });
        await voidFee(tx, contribution.id);
      });
      throw error;
    }
  }

  async list(chamaId: string, userId: string, filters: ContributionFiltersInput) {
    await this.assertMember(chamaId, userId);

    return this.prisma.contribution.findMany({
      where: {
        chamaId,
        memberId: filters.memberId,
        status: filters.status as ContributionStatus | undefined,
        createdAt: {
          gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          lte: filters.dateTo ? new Date(filters.dateTo) : undefined
        }
      },
      include: {
        member: {
          include: { user: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async summary(chamaId: string, userId: string) {
    await this.assertMember(chamaId, userId);

    const [paid, outstanding, members] = await Promise.all([
      this.prisma.contribution.aggregate({
        where: {
          chamaId,
          status: ContributionStatus.PAID
        },
        _sum: { amount: true }
      }),
      this.prisma.contribution.aggregate({
        where: {
          chamaId,
          status: { in: [ContributionStatus.PENDING, ContributionStatus.LATE] }
        },
        _sum: { amount: true }
      }),
      this.prisma.chamaMember.findMany({
        where: {
          chamaId,
          isActive: true
        },
        include: {
          user: true,
          contributions: true
        }
      })
    ]);

    return {
      totalPaid: paid._sum.amount ?? 0,
      outstanding: outstanding._sum.amount ?? 0,
      members: members.map((member) => {
        const totalPaid = member.contributions
          .filter((contribution) => contribution.status === ContributionStatus.PAID)
          .reduce((sum, contribution) => sum + contribution.amount, 0);
        const outstanding = member.contributions
          .filter(
            (contribution) =>
              contribution.status === ContributionStatus.PENDING ||
              contribution.status === ContributionStatus.LATE
          )
          .reduce((sum, contribution) => sum + contribution.amount, 0);

        return {
          memberId: member.id,
          userId: member.userId,
          fullName: member.user.fullName,
          phone: member.user.phone,
          totalPaid,
          outstanding
        };
      })
    };
  }

  async poolBalance(chamaId: string) {
    const [paidContributions, disbursedLoans] = await Promise.all([
      this.prisma.contribution.aggregate({
        where: { chamaId, status: ContributionStatus.PAID },
        _sum: { amount: true }
      }),
      this.prisma.loan.aggregate({
        where: { chamaId, status: LoanStatus.DISBURSED },
        _sum: { amount: true }
      })
    ]);

    return (paidContributions._sum.amount ?? 0) - (disbursedLoans._sum.amount ?? 0);
  }

  private async assertMember(chamaId: string, userId: string): Promise<void> {
    const member = await this.prisma.chamaMember.findFirst({
      where: {
        chamaId,
        userId,
        isActive: true
      },
      select: { id: true }
    });

    if (!member) {
      throw new ContributionError("Chama not found", 404);
    }
  }
}

function centsToKes(amountInCents: number): number {
  return Math.ceil(amountInCents / 100);
}
