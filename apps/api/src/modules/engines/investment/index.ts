import { MemberRole } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../../plugins/auth";
import { requireRole } from "../../../plugins/roles";
import { InvestmentEngineService } from "./service";

const paramsSchema = z.object({ id: z.string() });
const investmentParamsSchema = z.object({ id: z.string(), investmentId: z.string() });
const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["MONEY_MARKET", "SACCO", "FIXED_DEPOSIT", "REAL_ESTATE", "BUSINESS", "STOCKS", "OTHER"]),
  amount: z.number().int().nonnegative(),
  currentValue: z.number().int().nonnegative(),
  status: z.enum(["ACTIVE", "MATURED", "LIQUIDATED", "CANCELLED"]),
  startedAt: z.string().datetime(),
  maturesAt: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional()
});
const updateSchema = z.object({
  currentValue: z.number().int().nonnegative().optional(),
  status: z.enum(["ACTIVE", "MATURED", "LIQUIDATED", "CANCELLED"]).optional()
});
const returnSchema = z.object({ amount: z.number().int().positive(), notes: z.string().optional() });

const investmentRoutes: FastifyPluginAsync<{ prisma?: any }> = async (fastify, options) => {
  const service = new InvestmentEngineService(options);
  const canManage = requireRole([MemberRole.ADMIN, MemberRole.TREASURER], { prisma: options.prisma });
  fastify.addHook("preHandler", requireAuth);
  fastify.post("/chamas/:id/investments", { preHandler: canManage }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = createSchema.parse(request.body);
    return reply.status(201).send(await service.create(params.id, { ...body, startedAt: new Date(body.startedAt), maturesAt: body.maturesAt ? new Date(body.maturesAt) : undefined }));
  });
  fastify.patch("/chamas/:id/investments/:investmentId", { preHandler: canManage }, async (request, reply) => {
    const params = investmentParamsSchema.parse(request.params);
    const body = updateSchema.parse(request.body);
    return reply.send(await service.update(params.investmentId, body));
  });
  fastify.post("/chamas/:id/investments/:investmentId/returns", { preHandler: canManage }, async (request, reply) => {
    const params = investmentParamsSchema.parse(request.params);
    const body = returnSchema.parse(request.body);
    return reply.status(201).send(await service.recordReturn(params.id, params.investmentId, body.amount, body.notes));
  });
  fastify.get("/chamas/:id/investments/portfolio", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    return reply.send(await service.portfolio(params.id));
  });
};

export default investmentRoutes;
export { InvestmentEngineService } from "./service";
