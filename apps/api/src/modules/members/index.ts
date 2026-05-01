import type { FastifyPluginAsync } from "fastify";
import { updateMeSchema } from "@chama/shared";
import { z } from "zod";
import { requireAuth } from "../../plugins/auth";
import { MemberError, MemberService } from "./service";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
const pushTokenSchema = z.object({
  pushToken: z.string().min(1).max(512)
});
const whatsappOptInSchema = z.object({
  whatsappOptIn: z.boolean()
});

export type MemberRoutesOptions = NonNullable<ConstructorParameters<typeof MemberService>[0]>;

const memberRoutes: FastifyPluginAsync<MemberRoutesOptions> = async (fastify, options) => {
  const service = new MemberService(options);

  fastify.addHook("preHandler", requireAuth);

  fastify.get("/me", async (request, reply) => {
    const user = await service.getMe(request.user.id);
    return reply.send(user);
  });

  fastify.patch("/me", async (request, reply) => {
    const body = updateMeSchema.parse(request.body);
    const user = await service.updateMe(request.user.id, body);
    return reply.send(user);
  });

  fastify.post("/me/push-token", async (request, reply) => {
    const body = pushTokenSchema.parse(request.body);
    const user = await service.updateMe(request.user.id, { pushToken: body.pushToken });
    return reply.send(user);
  });

  fastify.post("/me/whatsapp-optin", async (request, reply) => {
    const body = whatsappOptInSchema.parse(request.body);
    const user = await service.updateMe(request.user.id, { whatsappOptIn: body.whatsappOptIn });
    return reply.send(user);
  });

  fastify.get("/me/chamas", async (request, reply) => {
    const chamas = await service.getMyChamas(request.user.id);
    return reply.send(chamas);
  });

  fastify.get("/me/contributions", async (request, reply) => {
    const pagination = parsePagination(request.query);
    const contributions = await service.getMyContributions(request.user.id, pagination);
    return reply.send(contributions);
  });

  fastify.get("/me/loans", async (request, reply) => {
    const pagination = parsePagination(request.query);
    const loans = await service.getMyLoans(request.user.id, pagination);
    return reply.send(loans);
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof MemberError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if ("issues" in error) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });
};

function parsePagination(query: unknown) {
  const pagination = paginationSchema.parse(query);
  return {
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit
  };
}

export default memberRoutes;
export { MemberService, MemberError } from "./service";
