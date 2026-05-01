import { MemberRole } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import {
  createChamaSchema,
  inviteMemberSchema,
  updateChamaSettingsSchema,
  updateChamaSchema,
  updateMemberRoleSchema
} from "@chama/shared";
import { z } from "zod";
import { requireAuth } from "../../plugins/auth";
import { requireRole } from "../../plugins/roles";
import { ChamaError, ChamaService } from "./service";

const paramsSchema = z.object({ id: z.string().min(1) });
const memberParamsSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1)
});

export type ChamaRoutesOptions = NonNullable<ConstructorParameters<typeof ChamaService>[0]>;

const chamaRoutes: FastifyPluginAsync<ChamaRoutesOptions> = async (fastify, options) => {
  const service = new ChamaService(options);
  const adminOnly = requireRole([MemberRole.ADMIN], { prisma: options?.prisma as never });

  fastify.addHook("preHandler", requireAuth);

  fastify.post("/chamas", async (request, reply) => {
    const body = createChamaSchema.parse(request.body);
    const chama = await service.createChama(request.user.id, body);
    return reply.status(201).send(chama);
  });

  fastify.get("/chamas/:id", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const chama = await service.getChamaDetail(params.id, request.user.id);
    return reply.send(chama);
  });

  fastify.patch("/chamas/:id", { preHandler: adminOnly }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = updateChamaSchema.parse(request.body);
    const chama = await service.updateChama(params.id, request.user.id, body);
    return reply.send(chama);
  });

  fastify.patch("/chamas/:id/settings", { preHandler: adminOnly }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = updateChamaSettingsSchema.parse(request.body);
    const settings = await service.updateChamaSettings(params.id, request.user.id, body);
    return reply.send(settings);
  });

  fastify.post(
    "/chamas/:id/members",
    { preHandler: adminOnly },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const body = inviteMemberSchema.parse(request.body);
      const result = await service.inviteMember(params.id, request.user.id, body);
      return reply.status(201).send(result);
    }
  );

  fastify.delete(
    "/chamas/:id/members/:memberId",
    { preHandler: adminOnly },
    async (request, reply) => {
      const params = memberParamsSchema.parse(request.params);
      const member = await service.removeMember(params.id, params.memberId, request.user.id);
      return reply.send(member);
    }
  );

  fastify.patch(
    "/chamas/:id/members/:memberId/role",
    { preHandler: adminOnly },
    async (request, reply) => {
      const params = memberParamsSchema.parse(request.params);
      const body = updateMemberRoleSchema.parse(request.body);
      const member = await service.changeMemberRole(
        params.id,
        params.memberId,
        request.user.id,
        body
      );
      return reply.send(member);
    }
  );

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ChamaError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if ("issues" in error) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });
};

export default chamaRoutes;
export { ChamaService, ChamaError } from "./service";
