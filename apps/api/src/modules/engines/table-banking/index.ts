import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../../plugins/auth";
import { TableBankingService } from "./service";

const paramsSchema = z.object({ id: z.string() });
const meetingParamsSchema = z.object({ id: z.string(), meetingId: z.string() });
const meetingSchema = z.object({ title: z.string().min(1), heldAt: z.string().datetime().optional(), minutes: z.string().optional() });
const instantLoanSchema = z.object({ amount: z.number().int().positive(), installments: z.number().int().min(1).default(1) });

const tableBankingRoutes: FastifyPluginAsync<{ prisma?: any; loanService?: any; checkEligibility?: any }> = async (fastify, options) => {
  const service = new TableBankingService(options);
  fastify.addHook("preHandler", requireAuth);
  fastify.post("/chamas/:id/meetings", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = meetingSchema.parse(request.body);
    return reply.status(201).send(await service.createMeeting(params.id, body.title, body.heldAt ? new Date(body.heldAt) : undefined, body.minutes));
  });
  fastify.get("/chamas/:id/meetings", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    return reply.send(await service.listMeetings(params.id));
  });
  fastify.post("/chamas/:id/meetings/:meetingId/loans", async (request, reply) => {
    meetingParamsSchema.parse(request.params);
    const params = paramsSchema.parse(request.params);
    const body = instantLoanSchema.parse(request.body);
    return reply.send(await service.instantLoan(params.id, request.user.id, body.amount, body.installments));
  });
  fastify.get("/chamas/:id/pool", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    return reply.send(await service.pool(params.id));
  });
};

export default tableBankingRoutes;
export { TableBankingService } from "./service";
