import { ContributionStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { UpdateMeInput } from "@chama/shared";
import { prisma as defaultPrisma } from "../../lib/prisma";

type PrismaLike = Pick<PrismaClient, "user" | "chamaMember" | "contribution" | "loan">;

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
