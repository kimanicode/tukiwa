import { FeeStatus, FeeTransactionType, MemberRole, type PlatformFee, type PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma";

export type DeductionModel = "on_top" | "deducted" | "split_payments";

type FeeScheduleEntry = {
  rate: number;
  minFee: number;
  maxFee: number;
  deductionModel: DeductionModel;
};

export const feeSchedule: Record<FeeTransactionType, FeeScheduleEntry> = {
  [FeeTransactionType.CONTRIBUTION]: {
    rate: 0.008,
    minFee: 500,
    maxFee: 15000,
    deductionModel: "split_payments"
  },
  [FeeTransactionType.LOAN_DISBURSEMENT]: {
    rate: 0.01,
    minFee: 1000,
    maxFee: 50000,
    deductionModel: "deducted"
  },
  [FeeTransactionType.LOAN_REPAYMENT]: {
    rate: 0.005,
    minFee: 500,
    maxFee: 20000,
    deductionModel: "split_payments"
  },
  [FeeTransactionType.ROTATION_PAYOUT]: {
    rate: 0.008,
    minFee: 500,
    maxFee: 30000,
    deductionModel: "deducted"
  }
};

type PrismaLike = Pick<
  PrismaClient,
  "platformFee" | "auditLog" | "chamaMember" | "$transaction"
>;

export type FeeCalculation = {
  feeAmount: number;
  netAmount: number;
  feeRate: number;
  deductionModel: DeductionModel;
};

export function calculateFee(
  type: FeeTransactionType,
  grossAmountCents: number
): FeeCalculation {
  const schedule = feeSchedule[type];
  if (grossAmountCents <= 0) {
    return {
      feeAmount: 0,
      netAmount: 0,
      feeRate: schedule.rate,
      deductionModel: schedule.deductionModel
    };
  }

  const rawFee = Math.round(grossAmountCents * schedule.rate);
  const feeAmount = Math.min(Math.max(rawFee, schedule.minFee), schedule.maxFee);
  const netAmount =
    schedule.deductionModel === "deducted"
      ? Math.max(grossAmountCents - feeAmount, 0)
      : grossAmountCents;

  return {
    feeAmount,
    netAmount,
    feeRate: schedule.rate,
    deductionModel: schedule.deductionModel
  };
}

export async function createFeeRecord(
  prisma: Pick<PrismaClient, "platformFee">,
  input: {
    type: FeeTransactionType;
    referenceId: string;
    referenceType: string;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    feeRate: number;
    chamaId: string;
    memberId?: string | null;
    status?: FeeStatus;
  }
): Promise<PlatformFee> {
  return prisma.platformFee.create({
    data: {
      transactionType: input.type,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      grossAmount: input.grossAmount,
      feeAmount: input.feeAmount,
      netAmount: input.netAmount,
      feeRate: input.feeRate,
      status: input.status,
      chamaId: input.chamaId,
      memberId: input.memberId ?? null
    }
  });
}

export async function settleFee(
  prisma: Pick<PrismaClient, "platformFee">,
  referenceId: string
): Promise<void> {
  await prisma.platformFee.updateMany({
    where: { referenceId, status: FeeStatus.PENDING },
    data: { status: FeeStatus.SETTLED, settledAt: new Date() }
  });
}

export async function voidFee(
  prisma: Pick<PrismaClient, "platformFee">,
  referenceId: string
): Promise<void> {
  await prisma.platformFee.updateMany({
    where: { referenceId, status: FeeStatus.PENDING },
    data: { status: FeeStatus.FAILED }
  });
}

export class FeeService {
  constructor(private readonly deps: { prisma?: PrismaLike } = {}) {}

  private get prisma(): PrismaLike {
    return this.deps.prisma ?? defaultPrisma;
  }

  async getChamaPlatformFees(
    chamaId: string,
    filters: { status?: FeeStatus; from?: Date; to?: Date } = {}
  ) {
    return this.prisma.platformFee.findMany({
      where: {
        chamaId,
        status: filters.status,
        createdAt: {
          gte: filters.from,
          lte: filters.to
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getPlatformRevenueSummary(filters: { from?: Date; to?: Date } = {}) {
    const fees = await this.prisma.platformFee.findMany({
      where: {
        status: { in: [FeeStatus.SETTLED, FeeStatus.SPLIT] },
        createdAt: {
          gte: filters.from,
          lte: filters.to
        }
      },
      select: {
        chamaId: true,
        feeAmount: true,
        transactionType: true
      }
    });

    const byType = Object.fromEntries(
      Object.values(FeeTransactionType).map((type) => [type, 0])
    ) as Record<FeeTransactionType, number>;

    for (const fee of fees) {
      byType[fee.transactionType] += fee.feeAmount;
    }

    return {
      totalFees: fees.reduce((sum, fee) => sum + fee.feeAmount, 0),
      byType,
      chamaCount: new Set(fees.map((fee) => fee.chamaId)).size,
      transactionCount: fees.length
    };
  }

  async assertAnyChamaAdmin(actorId: string): Promise<void> {
    const admin = await this.prisma.chamaMember.findFirst({
      where: {
        userId: actorId,
        role: MemberRole.ADMIN,
        isActive: true
      },
      select: { id: true }
    });
    if (!admin) {
      throw new FeeError("Forbidden", 403);
    }
  }

  async waiveFee(feeId: string, actorId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const fee = await tx.platformFee.findUnique({ where: { id: feeId } });
      if (!fee) {
        throw new FeeError("Fee not found", 404);
      }

      const admin = await tx.chamaMember.findFirst({
        where: {
          chamaId: fee.chamaId,
          userId: actorId,
          role: MemberRole.ADMIN,
          isActive: true
        },
        select: { id: true }
      });
      if (!admin) {
        throw new FeeError("Forbidden", 403);
      }

      const updated = await tx.platformFee.update({
        where: { id: feeId },
        data: { status: FeeStatus.WAIVED }
      });

      await tx.auditLog.create({
        data: {
          chamaId: fee.chamaId,
          actorId,
          action: "PLATFORM_FEE_WAIVED",
          entity: "PlatformFee",
          entityId: feeId,
          meta: { reason }
        }
      });

      return updated;
    });
  }
}

export class FeeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}
