import type { FastifyPluginAsync } from "fastify";
import {
  contributionFiltersSchema,
  initiateContributionSchema
} from "@chama/shared";
import { z } from "zod";
import { validateCallback } from "../../lib/mpesa";
import { requireAuth } from "../../plugins/auth";
import { getMpesaCallbackQueue } from "../../jobs/mpesa-callback.queue";
import { ContributionError, ContributionService } from "./service";

const paramsSchema = z.object({ id: z.string().min(1) });

export type ContributionRoutesOptions = NonNullable<
  ConstructorParameters<typeof ContributionService>[0]
> & {
  queue?: {
    add(
      name: string,
      data: unknown,
      options: { jobId: string }
    ): Promise<unknown>;
  };
};

const contributionRoutes: FastifyPluginAsync<ContributionRoutesOptions> = async (
  fastify,
  options
) => {
  const service = new ContributionService(options);
  const queue = options.queue ?? getMpesaCallbackQueue();

  fastify.post("/mpesa/callback", async (request, reply) => {
    const callback = validateCallback(request.body);
    await queue.add("process", { callback }, { jobId: callback.checkoutRequestId });
    return reply.status(200).send({ message: "accepted" });
  });

  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", requireAuth);

    protectedRoutes.post(
      "/chamas/:id/contributions/initiate",
      async (request, reply) => {
        const params = paramsSchema.parse(request.params);
        const body = initiateContributionSchema.parse(request.body);
        const contribution = await service.initiate(
          params.id,
          request.user.id,
          request.user.phone,
          body
        );
        return reply.status(201).send(contribution);
      }
    );

    protectedRoutes.get("/chamas/:id/contributions", async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const filters = contributionFiltersSchema.parse(request.query);
      const contributions = await service.list(params.id, request.user.id, filters);
      return reply.send(contributions);
    });

    protectedRoutes.get("/chamas/:id/contributions/summary", async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const summary = await service.summary(params.id, request.user.id);
      return reply.send(summary);
    });
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ContributionError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if ("issues" in error) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });
};

export default contributionRoutes;
export { ContributionService, ContributionError } from "./service";
