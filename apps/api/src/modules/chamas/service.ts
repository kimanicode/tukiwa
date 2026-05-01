import { ChamaType, ContributionStatus, Cycle, LoanStatus, MemberRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type {
  CreateChamaInput,
  InviteMemberInput,
  UpdateChamaSettingsInput,
  UpdateChamaInput,
  UpdateMemberRoleInput
} from "@chama/shared";
import { sendSms as defaultSendSms } from "../../lib/sms";
import { prisma as defaultPrisma } from "../../lib/prisma";
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
  | "$transaction"
>;

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
    return this.prisma.$transaction(async (tx) => {
      const chama = await tx.chama.create({
        data: {
          name: input.name,
          type: input.type as ChamaType,
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
          requiresMeetingForLoan: true
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
