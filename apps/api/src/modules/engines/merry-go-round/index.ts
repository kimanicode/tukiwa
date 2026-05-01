import { MemberRole } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../../plugins/auth";
import { requireRole } from "../../../plugins/roles";
import { MerryGoRoundError, MerryGoRoundService } from "./service";

const paramsSchema = z.object({ id: z.string() });
const setupSchema = z.object({ memberIds: z.array(z.string()).min(1), startDate: z.string().datetime().optional() });

const merryGoRoundRoutes: FastifyPluginAsync<{ prisma?: any; b2cTransfer?: any; sendSms?: any }> = async (fastify, options) => {
  const service = new MerryGoRoundService(options);
  const adminOnly = requireRole([MemberRole.ADMIN], { prisma: options.prisma });
  fastify.addHook("preHandler", requireAuth);
  fastify.post("/chamas/:id/rotations/setup", { preHandler: adminOnly }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = setupSchema.parse(request.body);
    return reply.status(201).send(await service.setup(params.id, request.user.id, body.memberIds, body.startDate ? new Date(body.startDate) : undefined));
  });
  fastify.get("/chamas/:id/rotations", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    return reply.send(await service.list(params.id));
  });
  fastify.post("/chamas/:id/rotations/payout", { preHandler: adminOnly }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    return reply.send(await service.payout(params.id, request.user.id));
  });
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof MerryGoRoundError) return reply.status(error.statusCode).send({ message: error.message });
    if ("issues" in error) return reply.status(400).send({ message: "Invalid request" });
    return reply.status(500).send({ message: "Internal server error" });
  });
};

export default merryGoRoundRoutes;
export { MerryGoRoundService } from "./service";
