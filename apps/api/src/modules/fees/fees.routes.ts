import { FeeStatus, FeeTransactionType, MemberRole } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../plugins/auth";
import { requireRole } from "../../plugins/roles";
import { calculateFee, FeeError, FeeService } from "./fee.service";

const previewQuerySchema = z.object({
  amount: z.coerce.number().int().min(0),
  type: z.string().transform((value, ctx) => {
    const normalized = value.trim().toUpperCase();
    const mapped =
      normalized === "CONTRIBUTION"
        ? FeeTransactionType.CONTRIBUTION
        : normalized === "LOAN_DISBURSEMENT"
          ? FeeTransactionType.LOAN_DISBURSEMENT
          : normalized === "LOAN_REPAYMENT"
            ? FeeTransactionType.LOAN_REPAYMENT
            : normalized === "ROTATION_PAYOUT"
              ? FeeTransactionType.ROTATION_PAYOUT
              : undefined;
    if (!mapped) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid fee transaction type" });
      return z.NEVER;
    }
    return mapped;
  })
});

const filtersSchema = z.object({
  status: z.nativeEnum(FeeStatus).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const chamaParamsSchema = z.object({ chamaId: z.string().min(1) });
const waiveParamsSchema = z.object({ feeId: z.string().min(1) });
const waiveBodySchema = z.object({ reason: z.string().min(2).max(500) });

export type FeeRoutesOptions = NonNullable<ConstructorParameters<typeof FeeService>[0]>;

const feeRoutes: FastifyPluginAsync<FeeRoutesOptions> = async (fastify, options) => {
  const service = new FeeService(options);
  const adminOnly = requireRole([MemberRole.ADMIN], { prisma: options.prisma as never });

  fastify.get("/fees/preview", async (request, reply) => {
    const query = previewQuerySchema.parse(request.query);
    const fee = calculateFee(query.type, query.amount);
    return reply.send({
      ...fee,
      chargeAmount:
        fee.deductionModel === "on_top"
          ? query.amount + fee.feeAmount
          : fee.netAmount
    });
  });

  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", requireAuth);

    protectedRoutes.get("/admin/fees/summary", async (request, reply) => {
      const query = filtersSchema.omit({ status: true }).parse(request.query);
      await service.assertAnyChamaAdmin(request.user.id);
      const summary = await service.getPlatformRevenueSummary(dateFilters(query));
      return reply.send(summary);
    });

    protectedRoutes.get(
      "/admin/fees/chama/:chamaId",
      { preHandler: adminOnly },
      async (request, reply) => {
        const params = chamaParamsSchema.parse(request.params);
        const query = filtersSchema.parse(request.query);
        const fees = await service.getChamaPlatformFees(params.chamaId, {
          ...dateFilters(query),
          status: query.status
        });
        return reply.send(fees);
      }
    );

    protectedRoutes.patch("/admin/fees/:feeId/waive", async (request, reply) => {
      const params = waiveParamsSchema.parse(request.params);
      const body = waiveBodySchema.parse(request.body);
      const fee = await service.waiveFee(params.feeId, request.user.id, body.reason);
      return reply.send(fee);
    });
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof FeeError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if ("issues" in error) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });
};

function dateFilters(filters: { from?: string; to?: string }) {
  return {
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined
  };
}

export default feeRoutes;
export { FeeService } from "./fee.service";
