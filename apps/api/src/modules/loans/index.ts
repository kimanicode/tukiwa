import { MemberRole } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import {
  applyLoanSchema,
  approveLoanSchema,
  loanFiltersSchema,
  repayLoanSchema
} from "@chama/shared";
import { z } from "zod";
import { requireAuth } from "../../plugins/auth";
import { requireRole } from "../../plugins/roles";
import { LoanError, LoanService } from "./service";

const paramsSchema = z.object({ id: z.string().min(1) });
const loanParamsSchema = z.object({ id: z.string().min(1), loanId: z.string().min(1) });

export type LoanRoutesOptions = NonNullable<ConstructorParameters<typeof LoanService>[0]>;

const loanRoutes: FastifyPluginAsync<LoanRoutesOptions> = async (fastify, options) => {
  const service = new LoanService(options);
  const canApprove = requireRole([MemberRole.ADMIN, MemberRole.TREASURER], {
    prisma: options.prisma as never
  });

  fastify.post("/mpesa/loan-callback", async (request, reply) => {
    const result = await service.handleCallback(request.body);
    return reply.status(200).send(result);
  });

  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", requireAuth);

    protectedRoutes.post("/chamas/:id/loans", async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const body = applyLoanSchema.parse(request.body);
      const loan = await service.apply(params.id, request.user.id, body);
      return reply.status(201).send(loan);
    });

    protectedRoutes.get("/chamas/:id/loans", async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const filters = loanFiltersSchema.parse(request.query);
      const loans = await service.list(params.id, request.user.id, filters);
      return reply.send(loans);
    });

    protectedRoutes.get("/chamas/:id/loans/:loanId", async (request, reply) => {
      const params = loanParamsSchema.parse(request.params);
      const loan = await service.detail(params.id, request.user.id, params.loanId);
      return reply.send(loan);
    });

    protectedRoutes.patch(
      "/chamas/:id/loans/:loanId/approve",
      { preHandler: canApprove },
      async (request, reply) => {
        const params = loanParamsSchema.parse(request.params);
        const body = approveLoanSchema.parse(request.body);
        const loan = await service.approve(params.id, request.user.id, params.loanId, body);
        return reply.send(loan);
      }
    );

    protectedRoutes.post(
      "/chamas/:id/loans/:loanId/disburse",
      { preHandler: canApprove },
      async (request, reply) => {
        const params = loanParamsSchema.parse(request.params);
        const loan = await service.disburse(params.id, request.user.id, params.loanId);
        return reply.send(loan);
      }
    );

    protectedRoutes.post("/chamas/:id/loans/:loanId/repay", async (request, reply) => {
      const params = loanParamsSchema.parse(request.params);
      const body = repayLoanSchema.parse(request.body);
      const repayment = await service.repay(
        params.id,
        request.user.id,
        request.user.phone,
        params.loanId,
        body
      );
      return reply.status(201).send(repayment);
    });
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof LoanError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    if ("issues" in error) {
      return reply.status(400).send({ message: "Invalid request" });
    }
    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });
};

export default loanRoutes;
export { LoanService, LoanError } from "./service";
export { checkLoanEligibility } from "./eligibility.service";
export { generateRepaymentSchedule } from "./schedule";
