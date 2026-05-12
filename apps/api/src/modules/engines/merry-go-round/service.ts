import { ContributionStatus, Cycle, FeeTransactionType, ProposalType, RotationStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "../../../lib/prisma";
import { b2cTransfer as defaultB2cTransfer } from "../../../lib/mpesa";
import { sendSms as defaultSendSms } from "../../../lib/sms";
import { Channel, NotificationEvent, NotificationService } from "../../notifications";
import { calculateFee, createFeeRecord, voidFee } from "../../fees/fee.service";
import { createProposal, shouldRequireProposal } from "../../treasury/proposal.service";

export class MerryGoRoundError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export class MerryGoRoundService {
  constructor(
    private readonly deps: {
      prisma?: any;
      b2cTransfer?: (phone: string, amount: number, remarks: string) => Promise<{ conversationId: string }>;
      sendSms?: (phone: string, message: string) => Promise<void>;
      notifications?: NotificationService;
      now?: () => Date;
    } = {}
  ) {}

  private get prisma() {
    return this.deps.prisma ?? defaultPrisma;
  }

  async setup(chamaId: string, actorId: string, memberIds: string[], startDate = new Date()) {
    const settings = await this.prisma.chamaSettings.findUnique({ where: { chamaId } });
    if (!settings) throw new MerryGoRoundError("Chama settings not found", 404);

    return this.prisma.$transaction(async (tx: any) => {
      await tx.rotation.deleteMany?.({ where: { chamaId } });
      const rotations = [];
      for (const [index, memberId] of memberIds.entries()) {
        rotations.push(
          await tx.rotation.create({
            data: {
              chamaId,
              memberId,
              position: index + 1,
              scheduledAt: scheduledAt(startDate, settings.contributionCycle, index),
              amount: settings.contributionAmount * memberIds.length,
              status: RotationStatus.SCHEDULED
            }
          })
        );
      }
      await tx.auditLog.create({
        data: { chamaId, actorId, action: "ROTATIONS_SETUP", entity: "Rotation", entityId: chamaId, meta: { memberIds } }
      });
      return rotations;
    });
  }

  async list(chamaId: string) {
    return this.prisma.rotation.findMany({
      where: { chamaId },
      include: { member: { include: { user: true } } },
      orderBy: { position: "asc" }
    });
  }

  async payout(chamaId: string, actorId: string) {
    const rotation = await this.prisma.rotation.findFirst({
      where: { chamaId, status: RotationStatus.SCHEDULED },
      include: { member: { include: { user: true } } },
      orderBy: { position: "asc" }
    });
    if (!rotation) throw new MerryGoRoundError("No pending rotation", 404);

    const unpaid = await this.prisma.contribution.count({
      where: {
        chamaId,
        dueDate: { lte: rotation.scheduledAt },
        status: { not: ContributionStatus.PAID }
      }
    });
    if (unpaid > 0) throw new MerryGoRoundError("All contributions must be paid before payout", 400);

    if (await shouldRequireProposal(chamaId, rotation.amount)) {
      const proposal = await createProposal(defaultPrisma, {
        chamaId,
        proposedBy: actorId,
        type: ProposalType.ROTATION_PAYOUT,
        referenceId: rotation.id,
        referenceType: "rotation_payout",
        amount: rotation.amount,
        recipientPhone: rotation.member.user.phone,
        recipientName: rotation.member.user.fullName,
        description: `Rotation payout - cycle ${rotation.position} to ${rotation.member.user.fullName}`
      });

      await this.prisma.auditLog.create({
        data: {
          chamaId,
          actorId,
          action: "ROTATION_PAYOUT_PROPOSAL_CREATED",
          entity: "Rotation",
          entityId: rotation.id,
          meta: { proposalId: proposal.id }
        }
      });

      return { requiresApproval: true, proposal };
    }

    const fee = calculateFee(FeeTransactionType.ROTATION_PAYOUT, rotation.amount);

    await this.prisma.$transaction(async (tx: any) => {
      await createFeeRecord(tx, {
        type: FeeTransactionType.ROTATION_PAYOUT,
        referenceId: rotation.id,
        referenceType: "rotation",
        grossAmount: rotation.amount,
        feeAmount: fee.feeAmount,
        netAmount: fee.netAmount,
        feeRate: fee.feeRate,
        chamaId,
        memberId: rotation.memberId
      });
    });

    let conversationId: string;
    try {
      const result = await (this.deps.b2cTransfer ?? defaultB2cTransfer)(
        rotation.member.user.phone,
        Math.ceil(fee.netAmount / 100),
        "Tukiwa merry-go-round payout"
      );
      conversationId = result.conversationId;
    } catch (error) {
      await this.prisma.$transaction(async (tx: any) => {
        await voidFee(tx, rotation.id);
      });
      throw error;
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.rotation.update({
        where: { id: rotation.id },
        data: { status: RotationStatus.PAID, paidAt: new Date() }
      });
      await tx.auditLog.create({
        data: {
          chamaId,
          actorId,
          action: "ROTATION_PAID",
          entity: "Rotation",
          entityId: rotation.id,
          meta: { conversationId, feeAmount: fee.feeAmount, netAmount: fee.netAmount }
        }
      });
      this.notify(
        rotation.member.userId,
        NotificationEvent.PAYOUT_SENT,
        { chamaId, rotationId: rotation.id, amount: rotation.amount },
        [Channel.WEBSOCKET, Channel.PUSH, Channel.SMS, Channel.WHATSAPP]
      );
      return updated;
    });
  }

  async sendOverdueReminders() {
    const now = this.deps.now?.() ?? new Date();
    const rotations = await this.prisma.rotation.findMany({
      where: { scheduledAt: { lt: now }, status: RotationStatus.SCHEDULED },
      include: { chama: { include: { members: { include: { user: true, contributions: true } } } } }
    });
    const sendSms = this.deps.sendSms ?? defaultSendSms;
    for (const rotation of rotations) {
      for (const member of rotation.chama.members) {
        const hasPaid = member.contributions.some(
          (contribution: any) =>
            contribution.chamaId === rotation.chamaId &&
            contribution.status === ContributionStatus.PAID
        );
        if (!hasPaid) {
          await sendSms(member.user.phone, "Reminder: your Tukiwa contribution is overdue.");
        }
      }
    }
  }

  private notify(
    userId: string,
    event: NotificationEvent,
    data: Record<string, unknown>,
    channels: Channel[]
  ): void {
    if (!userId) return;
    void (this.deps.notifications ?? new NotificationService({ prisma: this.prisma }))
      .send(userId, event, data, channels)
      .catch((error) => console.warn("MGR notification failed", error));
  }
}

function scheduledAt(startDate: Date, cycle: Cycle, offset: number) {
  const date = new Date(startDate);
  const days = cycle === Cycle.DAILY ? offset : cycle === Cycle.WEEKLY ? offset * 7 : cycle === Cycle.BIWEEKLY ? offset * 14 : cycle === Cycle.QUARTERLY ? offset * 91 : cycle === Cycle.YEARLY ? offset * 365 : offset * 30;
  date.setDate(date.getDate() + days);
  return date;
}
