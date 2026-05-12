import {
  ApprovalAction,
  FeeTransactionType,
  LoanStatus,
  MemberRole,
  Prisma,
  ProposalStatus,
  ProposalType,
  RotationStatus,
  type ChamaSignatory,
  type TxProposal
} from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma";
import { redis as defaultRedis } from "../../lib/redis";
import { b2cTransfer } from "../../lib/mpesa";
import { Channel, NotificationEvent, NotificationService } from "../notifications/notification.service";
import { calculateFee, createFeeRecord, settleFee, voidFee } from "../fees/fee.service";
import { getProposalExecutionQueue } from "../../jobs/proposal-execution.queue";

type PrismaClientLike = typeof defaultPrisma | Prisma.TransactionClient;

const SETTINGS_CACHE_TTL_SECONDS = 60;
const PROPOSAL_EXPIRY_HOURS = 48;

type TreasurySettingsSnapshot = {
  treasuryEnabled: boolean;
  requiredApprovals: number;
  proposalThresholdCents: number;
};

export class TreasuryError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export async function shouldRequireProposal(
  chamaId: string,
  amountCents: number,
  deps: { prisma?: PrismaClientLike; redis?: typeof defaultRedis } = {}
): Promise<boolean> {
  const settings = await getTreasurySettings(chamaId, deps);
  return settings.treasuryEnabled && amountCents >= settings.proposalThresholdCents;
}

export async function getActiveSignatories(
  chamaId: string,
  deps: { prisma?: PrismaClientLike; redis?: typeof defaultRedis } = {}
): Promise<ChamaSignatory[]> {
  const prisma = deps.prisma ?? defaultPrisma;
  const settings = await getTreasurySettings(chamaId, deps);
  const signatories = await prisma.chamaSignatory.findMany({
    where: { chamaId, isActive: true },
    orderBy: { addedAt: "asc" }
  });

  if (signatories.length < settings.requiredApprovals) {
    throw new TreasuryError(
      `Not enough signatories configured. Need at least ${settings.requiredApprovals}, have ${signatories.length}. Add more signatories in Treasury Settings before enabling Trustless Treasury.`,
      400
    );
  }

  return signatories;
}

export async function createProposal(
  prisma: PrismaClientLike,
  data: {
    chamaId: string;
    proposedBy: string;
    type: ProposalType;
    referenceId: string;
    referenceType: string;
    amount: number;
    recipientPhone: string;
    recipientName: string;
    description: string;
  }
): Promise<TxProposal> {
  const settings = await getTreasurySettings(data.chamaId, { prisma });
  const signatories = await getActiveSignatories(data.chamaId, { prisma });
  const proposer = await prisma.user.findUnique({
    where: { id: data.proposedBy },
    select: { fullName: true }
  });

  if (settings.requiredApprovals < 2 && signatories.some((item) => item.userId === data.proposedBy)) {
    throw new TreasuryError("At least two approvals are required when the proposer is also a signatory.", 400);
  }

  const proposal = await prisma.txProposal.create({
    data: {
      ...data,
      status: ProposalStatus.PENDING,
      requiredApprovals: settings.requiredApprovals,
      totalSignatories: signatories.length,
      expiresAt: new Date(Date.now() + PROPOSAL_EXPIRY_HOURS * 60 * 60 * 1000)
    }
  });

  await prisma.auditLog.create({
    data: {
      chamaId: data.chamaId,
      actorId: data.proposedBy,
      action: "PROPOSAL_CREATED",
      entity: "tx_proposal",
      entityId: proposal.id,
      meta: {
        type: data.type,
        amount: data.amount,
        recipientName: data.recipientName,
        requiredApprovals: settings.requiredApprovals
      }
    }
  });

  await notifyUsers(
    signatories.map((item) => item.userId),
    NotificationEvent.PROPOSAL_CREATED,
    {
      chamaId: data.chamaId,
      proposalId: proposal.id,
      amount: data.amount,
      message: `${proposer?.fullName ?? "A member"} proposed ${data.type} of ${formatKes(data.amount)} to ${data.recipientName}. Open Tukiwa to review.`
    },
    [Channel.PUSH, Channel.WHATSAPP, Channel.WEBSOCKET]
  );

  return proposal;
}

export async function submitApproval(data: {
  proposalId: string;
  signatoryUserId: string;
  action: ApprovalAction;
  reason?: string;
  deviceMeta?: Prisma.InputJsonValue;
  pinVerified: boolean;
}): Promise<TxProposal> {
  if (!data.pinVerified) {
    throw new TreasuryError("PIN verification is required for treasury approvals.", 403);
  }

  return defaultPrisma.$transaction(async (tx) => {
    const proposal = await tx.txProposal.findUnique({
      where: { id: data.proposalId },
      include: { approvals: true, proposer: true }
    });
    if (!proposal) throw new TreasuryError("Proposal not found", 404);
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new TreasuryError("Only pending proposals can be reviewed.", 400);
    }
    if (proposal.expiresAt < new Date()) {
      const expired = await tx.txProposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.EXPIRED, expiredAt: new Date() }
      });
      await tx.auditLog.create({
        data: {
          chamaId: proposal.chamaId,
          actorId: data.signatoryUserId,
          action: "PROPOSAL_EXPIRED",
          entity: "tx_proposal",
          entityId: proposal.id
        }
      });
      return expired;
    }

    const signatory = await tx.chamaSignatory.findFirst({
      where: { chamaId: proposal.chamaId, userId: data.signatoryUserId, isActive: true }
    });
    if (!signatory) throw new TreasuryError("Only active signatories can review this proposal.", 403);

    const existingVote = await tx.txProposalApproval.findUnique({
      where: {
        proposalId_signatoryId: {
          proposalId: proposal.id,
          signatoryId: data.signatoryUserId
        }
      }
    });
    if (existingVote) throw new TreasuryError("You have already reviewed this proposal.", 409);
    if (data.action === ApprovalAction.REJECTED && (!data.reason || data.reason.trim().length < 10)) {
      throw new TreasuryError("A rejection reason of at least 10 characters is required.", 400);
    }

    await tx.txProposalApproval.create({
      data: {
        proposalId: proposal.id,
        signatoryId: data.signatoryUserId,
        action: data.action,
        reason: data.reason,
        deviceMeta: data.deviceMeta ?? Prisma.JsonNull
      }
    });

    await tx.auditLog.create({
      data: {
        chamaId: proposal.chamaId,
        actorId: data.signatoryUserId,
        action: data.action === ApprovalAction.APPROVED ? "PROPOSAL_APPROVED" : "PROPOSAL_REJECTED",
        entity: "tx_proposal",
        entityId: proposal.id,
        meta: { reason: data.reason }
      }
    });

    if (data.action === ApprovalAction.REJECTED) {
      const rejected = await tx.txProposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.REJECTED }
      });
      await notifyUsers([proposal.proposedBy], NotificationEvent.PROPOSAL_REJECTED, {
        chamaId: proposal.chamaId,
        proposalId: proposal.id,
        message: `A signatory rejected the proposal. Reason: ${data.reason}`
      });
      return rejected;
    }

    const approvedCount = await tx.txProposalApproval.count({
      where: { proposalId: proposal.id, action: ApprovalAction.APPROVED }
    });

    if (approvedCount >= proposal.requiredApprovals) {
      const approved = await tx.txProposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.APPROVED }
      });
      await getProposalExecutionQueue().add(
        "execute",
        { proposalId: proposal.id },
        { attempts: 2, backoff: { type: "exponential", delay: 3000 } }
      );
      await notifyUsers([proposal.proposedBy], NotificationEvent.PROPOSAL_APPROVED, {
        chamaId: proposal.chamaId,
        proposalId: proposal.id,
        message: "Proposal approved. Executing transfer..."
      });
      return approved;
    }

    const updated = await tx.txProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    await notifyRemainingSignatories(tx, proposal.id, proposal.chamaId, approvedCount, proposal.requiredApprovals);
    return updated;
  });
}

export async function executeProposal(proposalId: string): Promise<TxProposal> {
  const proposal = await defaultPrisma.txProposal.findUnique({
    where: { id: proposalId },
    include: { approvals: true }
  });
  if (!proposal) throw new TreasuryError("Proposal not found", 404);
  if (proposal.status !== ProposalStatus.APPROVED) return proposal;

  const feeType = proposal.type === ProposalType.ROTATION_PAYOUT
    ? FeeTransactionType.ROTATION_PAYOUT
    : FeeTransactionType.LOAN_DISBURSEMENT;
  const fee = calculateFee(feeType, proposal.amount);

  await defaultPrisma.$transaction(async (tx) => {
    await tx.txProposal.update({
      where: { id: proposal.id },
      data: { status: ProposalStatus.EXECUTING }
    });
    await createFeeRecord(tx, {
      type: feeType,
      referenceId: proposal.id,
      referenceType: proposal.referenceType,
      grossAmount: proposal.amount,
      feeAmount: fee.feeAmount,
      netAmount: fee.netAmount,
      feeRate: fee.feeRate,
      chamaId: proposal.chamaId
    });
    await tx.auditLog.create({
      data: {
        chamaId: proposal.chamaId,
        actorId: proposal.proposedBy,
        action: "PROPOSAL_EXECUTING",
        entity: "tx_proposal",
        entityId: proposal.id,
        meta: { grossAmount: proposal.amount, netAmount: fee.netAmount, feeAmount: fee.feeAmount }
      }
    });
  });

  try {
    const transfer = await b2cTransfer(proposal.recipientPhone, Math.ceil(fee.netAmount / 100), proposal.description);
    const executed = await defaultPrisma.txProposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.EXECUTED,
        executedAt: new Date(),
        mpesaRef: transfer.conversationId
      }
    });
    if (proposal.type === ProposalType.LOAN_DISBURSEMENT) {
      await defaultPrisma.loan.updateMany({
        where: { id: proposal.referenceId, chamaId: proposal.chamaId },
        data: { status: LoanStatus.DISBURSED, disbursementRef: transfer.conversationId }
      });
    }
    if (proposal.type === ProposalType.ROTATION_PAYOUT) {
      await defaultPrisma.rotation.updateMany({
        where: { id: proposal.referenceId, chamaId: proposal.chamaId },
        data: { status: RotationStatus.PAID, paidAt: new Date() }
      });
    }
    await settleFee(defaultPrisma, proposal.id);
    await defaultPrisma.auditLog.create({
      data: {
        chamaId: proposal.chamaId,
        actorId: proposal.proposedBy,
        action: "PROPOSAL_EXECUTED",
        entity: "tx_proposal",
        entityId: proposal.id,
        meta: { mpesaRef: transfer.conversationId }
      }
    });
    await notifyChamaMembers(proposal.chamaId, NotificationEvent.PROPOSAL_EXECUTED, {
      chamaId: proposal.chamaId,
      proposalId: proposal.id,
      amount: proposal.amount,
      message: `Transfer of ${formatKes(proposal.amount)} to ${proposal.recipientName} completed.`
    });
    return executed;
  } catch (error) {
    await voidFee(defaultPrisma, proposal.id);
    const failed = await defaultPrisma.txProposal.update({
      where: { id: proposal.id },
      data: {
        status: ProposalStatus.FAILED,
        failureReason: error instanceof Error ? error.message : "Transfer failed"
      }
    });
    await notifyChamaMembers(proposal.chamaId, NotificationEvent.PROPOSAL_REJECTED, {
      chamaId: proposal.chamaId,
      proposalId: proposal.id,
      message: "Proposal transfer failed. Review it in Treasury."
    });
    return failed;
  }
}

export async function expireStaleProposals(): Promise<number> {
  const stale = await defaultPrisma.txProposal.findMany({
    where: { status: ProposalStatus.PENDING, expiresAt: { lt: new Date() } }
  });

  for (const proposal of stale) {
    await defaultPrisma.txProposal.update({
      where: { id: proposal.id },
      data: { status: ProposalStatus.EXPIRED, expiredAt: new Date() }
    });
    await defaultPrisma.auditLog.create({
      data: {
        chamaId: proposal.chamaId,
        actorId: proposal.proposedBy,
        action: "PROPOSAL_EXPIRED",
        entity: "tx_proposal",
        entityId: proposal.id
      }
    });
    await notifyChamaMembers(proposal.chamaId, NotificationEvent.PROPOSAL_EXPIRED, {
      chamaId: proposal.chamaId,
      proposalId: proposal.id,
      message: "A treasury proposal expired without enough approvals."
    });
  }

  return stale.length;
}

export async function cancelProposal(proposalId: string, requestedByUserId: string): Promise<TxProposal> {
  const proposal = await defaultPrisma.txProposal.findUnique({
    where: { id: proposalId },
    include: { approvals: true }
  });
  if (!proposal) throw new TreasuryError("Proposal not found", 404);
  if (proposal.status !== ProposalStatus.PENDING || proposal.approvals.length > 0) {
    throw new TreasuryError("Only pending proposals with no approvals can be cancelled.", 400);
  }
  const admin = await defaultPrisma.chamaMember.findFirst({
    where: { chamaId: proposal.chamaId, userId: requestedByUserId, isActive: true, role: MemberRole.ADMIN }
  });
  if (proposal.proposedBy !== requestedByUserId && !admin) {
    throw new TreasuryError("Only the proposer or an admin can cancel this proposal.", 403);
  }

  const cancelled = await defaultPrisma.txProposal.update({
    where: { id: proposal.id },
    data: { status: ProposalStatus.CANCELLED }
  });
  await defaultPrisma.auditLog.create({
    data: {
      chamaId: proposal.chamaId,
      actorId: requestedByUserId,
      action: "PROPOSAL_CANCELLED",
      entity: "tx_proposal",
      entityId: proposal.id
    }
  });
  await notifyChamaMembers(proposal.chamaId, NotificationEvent.PROPOSAL_CANCELLED, {
    chamaId: proposal.chamaId,
    proposalId: proposal.id,
    message: "A treasury proposal was cancelled."
  });
  return cancelled;
}

export async function getProposalFeed(
  chamaId: string,
  filters: { status?: ProposalStatus; type?: ProposalType; from?: Date; to?: Date; page?: number; limit?: number } = {}
) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
  return defaultPrisma.txProposal.findMany({
    where: {
      chamaId,
      status: filters.status,
      type: filters.type,
      createdAt: {
        gte: filters.from,
        lte: filters.to
      }
    },
    include: {
      approvals: { include: { signatory: true }, orderBy: { signedAt: "asc" } },
      proposer: true
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit
  });
}

async function getTreasurySettings(
  chamaId: string,
  deps: { prisma?: PrismaClientLike; redis?: typeof defaultRedis } = {}
): Promise<TreasurySettingsSnapshot> {
  const redis = deps.redis ?? defaultRedis;
  const cacheKey = `chama_settings:${chamaId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached) as TreasurySettingsSnapshot;

  const prisma = deps.prisma ?? defaultPrisma;
  const settings = await prisma.chamaSettings.findUnique({
    where: { chamaId },
    select: {
      treasuryEnabled: true,
      requiredApprovals: true,
      proposalThresholdCents: true
    }
  });
  if (!settings) {
    return {
      treasuryEnabled: false,
      requiredApprovals: 2,
      proposalThresholdCents: 500000
    };
  }

  await redis.set(cacheKey, JSON.stringify(settings), "EX", SETTINGS_CACHE_TTL_SECONDS).catch(() => undefined);
  return settings;
}

async function notifyUsers(
  userIds: string[],
  event: NotificationEvent,
  data: Record<string, unknown>,
  channels: Channel[] = [Channel.PUSH, Channel.WEBSOCKET]
) {
  const notification = new NotificationService();
  await Promise.allSettled(userIds.map((userId) => notification.send(userId, event, data, channels)));
}

async function notifyChamaMembers(
  chamaId: string,
  event: NotificationEvent,
  data: Record<string, unknown>
) {
  const members = await defaultPrisma.chamaMember.findMany({
    where: { chamaId, isActive: true },
    select: { userId: true }
  });
  await notifyUsers(members.map((member) => member.userId), event, data);
}

async function notifyRemainingSignatories(
  prisma: Prisma.TransactionClient,
  proposalId: string,
  chamaId: string,
  approvedCount: number,
  requiredApprovals: number
) {
  const voted = await prisma.txProposalApproval.findMany({
    where: { proposalId },
    select: { signatoryId: true }
  });
  const votedIds = new Set(voted.map((item) => item.signatoryId));
  const remaining = await prisma.chamaSignatory.findMany({
    where: { chamaId, isActive: true, userId: { notIn: [...votedIds] } },
    select: { userId: true }
  });
  await notifyUsers(
    remaining.map((item) => item.userId),
    NotificationEvent.PROPOSAL_APPROVED,
    {
      chamaId,
      proposalId,
      message: `${approvedCount} of ${requiredApprovals} approvals received. ${requiredApprovals - approvedCount} more needed.`
    }
  );
}

function formatKes(amount: number): string {
  return `KSh ${(amount / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}
