import { ContributionStatus, LoanStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { prisma as defaultPrisma } from "../../lib/prisma";

type PrismaLike = {
  user: {
    findUnique(args: unknown): Promise<{ kycVerified: boolean } | null>;
  };
  loan: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
  chamaSettings: {
    findUnique(args: unknown): Promise<{ maxLoanMultiplier: number } | null>;
  };
  contribution: {
    aggregate(args: unknown): Promise<{ _sum: { amount: number | null } }>;
  };
};

export type LoanEligibility = {
  eligible: boolean;
  maxAmount: number;
  reason?: string;
};

export async function checkLoanEligibility(
  userId: string,
  chamaId: string,
  requestedAmount: number,
  deps: { prisma?: PrismaLike } = {}
): Promise<LoanEligibility> {
  const prisma = deps.prisma ?? defaultPrisma;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycVerified: true }
  });

  if (!user?.kycVerified) {
    return { eligible: false, maxAmount: 0, reason: "KYC not verified" };
  }

  const activeLoan = await prisma.loan.findFirst({
    where: {
      chamaId,
      borrowerId: userId,
      status: { in: [LoanStatus.DISBURSED, LoanStatus.PARTIALLY_REPAID] }
    },
    select: { id: true }
  });

  if (activeLoan) {
    return { eligible: false, maxAmount: 0, reason: "Active loan exists" };
  }

  const [settings, paid] = await Promise.all([
    prisma.chamaSettings.findUnique({
      where: { chamaId },
      select: { maxLoanMultiplier: true }
    }),
    prisma.contribution.aggregate({
      where: {
        chamaId,
        member: { userId },
        status: ContributionStatus.PAID
      },
      _sum: { amount: true }
    })
  ]);

  const paidTotal = new Decimal(paid._sum.amount ?? 0);
  const multiplier = new Decimal(settings?.maxLoanMultiplier ?? 0);
  const maxAmount = paidTotal.mul(multiplier).floor().toNumber();

  if (requestedAmount > maxAmount) {
    return { eligible: false, maxAmount, reason: "Requested amount exceeds limit" };
  }

  return { eligible: true, maxAmount };
}
