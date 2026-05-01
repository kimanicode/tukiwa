import { MemberRole } from "@prisma/client";
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { prisma as defaultPrisma } from "../lib/prisma";

type PrismaLike = {
  chamaMember: {
    findFirst(args: unknown): Promise<{ id: string; role: MemberRole } | null>;
  };
};

export function requireRole(
  roles: MemberRole[],
  deps: { prisma?: PrismaLike } = {}
): preHandlerHookHandler {
  const prisma = deps.prisma ?? defaultPrisma;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const chamaId = getChamaId(request.params);
    if (!chamaId) {
      return reply.status(400).send({ message: "Missing chama id" });
    }

    const member = await prisma.chamaMember.findFirst({
      where: {
        chamaId,
        userId: request.user.id,
        isActive: true
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!member || !roles.includes(member.role)) {
      return reply.status(403).send({ message: "Forbidden" });
    }
  };
}

function getChamaId(params: unknown): string | undefined {
  if (typeof params !== "object" || params === null) {
    return undefined;
  }

  const value = (params as { id?: unknown; chamaId?: unknown }).id ?? (params as { chamaId?: unknown }).chamaId;
  return typeof value === "string" ? value : undefined;
}
