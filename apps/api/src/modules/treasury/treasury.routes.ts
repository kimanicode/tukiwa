import {
  ApprovalAction,
  MemberRole,
  ProposalStatus,
  ProposalType,
  Prisma
} from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../plugins/auth";
import { requireRole } from "../../plugins/roles";
import { verifyPin } from "../auth/pin.service";
import {
  cancelProposal,
  getProposalFeed,
  submitApproval,
  TreasuryError
} from "./proposal.service";

const paramsSchema = z.object({ id: z.string().min(1) });
const proposalParamsSchema = z.object({ id: z.string().min(1), proposalId: z.string().min(1) });
const signatoryParamsSchema = z.object({ id: z.string().min(1), signatoryId: z.string().min(1) });
const addSignatorySchema = z.object({ userId: z.string().min(1) });
const settingsSchema = z
  .object({
    treasuryEnabled: z.boolean().optional(),
    requiredApprovals: z.number().int().min(1).max(10).optional(),
    proposalThresholdCents: z.number().int().min(0).optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });
const approveSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
  deviceMeta: z.record(z.unknown()).optional()
});
const rejectSchema = approveSchema.extend({ reason: z.string().min(10).max(500) });
const feedQuerySchema = z.object({
  status: z.nativeEnum(ProposalStatus).optional(),
  type: z.nativeEnum(ProposalType).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

const treasuryRoutes: FastifyPluginAsync = async (fastify) => {
  const adminOnly = requireRole([MemberRole.ADMIN]);
  const adminOrTreasurer = requireRole([MemberRole.ADMIN, MemberRole.TREASURER]);

  fastify.addHook("preHandler", requireAuth);

  fastify.get("/chamas/:id/treasury/signatories", async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    await assertMember(id, request.user.id);
    const signatories = await prisma.chamaSignatory.findMany({
      where: { chamaId: id, isActive: true },
      include: { user: true },
      orderBy: { addedAt: "asc" }
    });
    return reply.send(signatories);
  });

  fastify.post(
    "/chamas/:id/treasury/signatories",
    { preHandler: adminOnly },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const body = addSignatorySchema.parse(request.body);
      const [member, activeCount] = await Promise.all([
        prisma.chamaMember.findFirst({
          where: { chamaId: id, userId: body.userId, isActive: true }
        }),
        prisma.chamaSignatory.count({ where: { chamaId: id, isActive: true } })
      ]);
      if (!member) return reply.status(400).send({ message: "Signatory must be an active chama member" });
      if (activeCount >= 10) return reply.status(400).send({ message: "A chama can have at most 10 signatories" });

      const signatory = await prisma.chamaSignatory.upsert({
        where: { chamaId_userId: { chamaId: id, userId: body.userId } },
        update: { isActive: true, removedAt: null },
        create: { chamaId: id, userId: body.userId, addedBy: request.user.id },
        include: { user: true }
      });
      await prisma.auditLog.create({
        data: {
          chamaId: id,
          actorId: request.user.id,
          action: "SIGNATORY_ADDED",
          entity: "chama_signatory",
          entityId: signatory.id,
          meta: { userId: body.userId }
        }
      });
      return reply.status(201).send(signatory);
    }
  );

  fastify.delete(
    "/chamas/:id/treasury/signatories/:signatoryId",
    { preHandler: adminOnly },
    async (request, reply) => {
      const { id, signatoryId } = signatoryParamsSchema.parse(request.params);
      const settings = await prisma.chamaSettings.findUniqueOrThrow({ where: { chamaId: id } });
      const activeCount = await prisma.chamaSignatory.count({ where: { chamaId: id, isActive: true } });
      if (activeCount - 1 < settings.requiredApprovals) {
        return reply.status(400).send({ message: "Remaining signatories cannot be fewer than required approvals" });
      }
      const signatory = await prisma.chamaSignatory.update({
        where: { id: signatoryId },
        data: { isActive: false, removedAt: new Date() }
      });
      await prisma.auditLog.create({
        data: {
          chamaId: id,
          actorId: request.user.id,
          action: "SIGNATORY_REMOVED",
          entity: "chama_signatory",
          entityId: signatoryId
        }
      });
      return reply.send(signatory);
    }
  );

  fastify.get("/chamas/:id/treasury/proposals", async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    await assertMember(id, request.user.id);
    const query = feedQuerySchema.parse(request.query);
    const proposals = await getProposalFeed(id, {
      ...query,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined
    });
    return reply.send(proposals);
  });

  fastify.get("/chamas/:id/treasury/proposals/:proposalId", async (request, reply) => {
    const { id, proposalId } = proposalParamsSchema.parse(request.params);
    await assertMember(id, request.user.id);
    const proposal = await prisma.txProposal.findFirst({
      where: { id: proposalId, chamaId: id },
      include: { approvals: { include: { signatory: true } }, proposer: true }
    });
    if (!proposal) return reply.status(404).send({ message: "Proposal not found" });
    return reply.send(proposal);
  });

  fastify.post("/chamas/:id/treasury/proposals/:proposalId/approve", async (request, reply) => {
    const { id, proposalId } = proposalParamsSchema.parse(request.params);
    const body = approveSchema.parse(request.body);
    await assertSignatory(id, request.user.id);
    const pinVerified = await verifyRequestPin(request.user.id, body.pin);
    if (!pinVerified) return reply.status(401).send({ message: "Incorrect PIN" });
    const proposal = await submitApproval({
      proposalId,
      signatoryUserId: request.user.id,
      action: ApprovalAction.APPROVED,
      deviceMeta: body.deviceMeta as Prisma.InputJsonValue | undefined,
      pinVerified
    });
    return reply.send(proposal);
  });

  fastify.post("/chamas/:id/treasury/proposals/:proposalId/reject", async (request, reply) => {
    const { id, proposalId } = proposalParamsSchema.parse(request.params);
    const body = rejectSchema.parse(request.body);
    await assertSignatory(id, request.user.id);
    const pinVerified = await verifyRequestPin(request.user.id, body.pin);
    if (!pinVerified) return reply.status(401).send({ message: "Incorrect PIN" });
    const proposal = await submitApproval({
      proposalId,
      signatoryUserId: request.user.id,
      action: ApprovalAction.REJECTED,
      reason: body.reason,
      deviceMeta: body.deviceMeta as Prisma.InputJsonValue | undefined,
      pinVerified
    });
    return reply.send(proposal);
  });

  fastify.post("/chamas/:id/treasury/proposals/:proposalId/cancel", async (request, reply) => {
    const { id, proposalId } = proposalParamsSchema.parse(request.params);
    await assertMember(id, request.user.id);
    const proposal = await cancelProposal(proposalId, request.user.id);
    return reply.send(proposal);
  });

  fastify.get("/chamas/:id/treasury/settings", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const settings = await prisma.chamaSettings.findUnique({
      where: { chamaId: id },
      select: { treasuryEnabled: true, requiredApprovals: true, proposalThresholdCents: true }
    });
    return reply.send(settings);
  });

  fastify.patch("/chamas/:id/treasury/settings", { preHandler: adminOnly }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const body = settingsSchema.parse(request.body);
    const signatoryCount = await prisma.chamaSignatory.count({ where: { chamaId: id, isActive: true } });
    const required = body.requiredApprovals ?? (await prisma.chamaSettings.findUniqueOrThrow({ where: { chamaId: id } })).requiredApprovals;
    if ((body.treasuryEnabled || body.requiredApprovals) && signatoryCount < required) {
      return reply.status(400).send({ message: "Active signatories must be at least required approvals" });
    }
    const settings = await prisma.chamaSettings.update({ where: { chamaId: id }, data: body });
    await prisma.auditLog.create({
      data: {
        chamaId: id,
        actorId: request.user.id,
        action: "TREASURY_SETTINGS_UPDATED",
        entity: "chama_settings",
        entityId: id,
        meta: { changedFields: Object.keys(body) }
      }
    });
    return reply.send(settings);
  });

  fastify.get("/chamas/:id/treasury/anomalies", { preHandler: adminOrTreasurer }, async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const proposals = await prisma.txProposal.findMany({
      where: { chamaId: id },
      include: { approvals: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    const pool = await getPoolBalance(id);
    const anomalies = proposals.flatMap((proposal) => {
      const results: Array<{ proposalId: string; type: string; description: string; severity: string }> = [];
      if (proposal.approvals.some((approval) => approval.signatoryId === proposal.proposedBy)) {
        results.push({ proposalId: proposal.id, type: "SELF_APPROVAL", description: "Proposer also voted on this proposal.", severity: "medium" });
      }
      const firstApproval = proposal.approvals[0]?.signedAt.getTime();
      const lastApproval = proposal.approvals.at(-1)?.signedAt.getTime();
      if (firstApproval && lastApproval && lastApproval - firstApproval <= 5 * 60 * 1000 && proposal.approvals.length >= proposal.requiredApprovals) {
        results.push({ proposalId: proposal.id, type: "FAST_APPROVAL", description: "All required approvals were collected within 5 minutes.", severity: "low" });
      }
      if (pool > 0 && proposal.amount > pool * 0.5) {
        results.push({ proposalId: proposal.id, type: "LARGE_TRANSFER", description: "Proposal amount is more than 50% of current pool balance.", severity: "high" });
      }
      return results;
    });
    return reply.send(anomalies);
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof TreasuryError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    if ("issues" in error) {
      return reply.status(400).send({ message: "Invalid request" });
    }
    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });
};

async function assertMember(chamaId: string, userId: string) {
  const member = await prisma.chamaMember.findFirst({ where: { chamaId, userId, isActive: true } });
  if (!member) throw new TreasuryError("Chama not found", 404);
  return member;
}

async function assertSignatory(chamaId: string, userId: string) {
  const signatory = await prisma.chamaSignatory.findFirst({ where: { chamaId, userId, isActive: true } });
  if (!signatory) throw new TreasuryError("Only active signatories can review proposals.", 403);
  return signatory;
}

async function verifyRequestPin(userId: string, pin: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  if (!user?.pinHash) return false;
  return verifyPin(pin, user.pinHash);
}

async function getPoolBalance(chamaId: string): Promise<number> {
  const [paidContributions, disbursedLoans] = await Promise.all([
    prisma.contribution.aggregate({ where: { chamaId, status: "PAID" }, _sum: { amount: true } }),
    prisma.loan.aggregate({ where: { chamaId, status: "DISBURSED" }, _sum: { amount: true } })
  ]);
  return (paidContributions._sum.amount ?? 0) - (disbursedLoans._sum.amount ?? 0);
}

export default treasuryRoutes;
