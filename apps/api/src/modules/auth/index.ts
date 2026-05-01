import type { FastifyPluginAsync } from "fastify";
import { devLoginSchema, requestOtpSchema, verifyOtpSchema } from "@chama/shared";
import { z } from "zod";
import { AuthError, AuthService } from "./service";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AuthService(fastify.jwt, { logger: fastify.log });

  fastify.post("/auth/request-otp", async (request, reply) => {
    const body = requestOtpSchema.parse(request.body);
    const response = await service.requestOtp(body.phone);
    return reply.send(response);
  });

  fastify.post("/auth/verify-otp", async (request, reply) => {
    const body = verifyOtpSchema.parse(request.body);
    const response = await service.verifyOtp(body.phone, body.code);
    return reply.send(response);
  });

  fastify.post("/auth/refresh", async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    const response = await service.refresh(body.refreshToken);
    return reply.send(response);
  });

  fastify.post("/auth/logout", async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body);
    const response = await service.logout(body.refreshToken);
    return reply.send(response);
  });

  fastify.post("/auth/dev-login", async (request, reply) => {
    if (process.env.NODE_ENV === "production") {
      return reply.status(404).send({ message: "Not found" });
    }

    const body = devLoginSchema.parse(request.body);
    const response = await service.devLogin(body.phone, body.fullName);
    return reply.send(response);
  });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AuthError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if ("issues" in error) {
      return reply.status(400).send({ message: "Invalid request body" });
    }

    request.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });
};

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export default authRoutes;
export { AuthService, normalizeKenyanPhone, AuthError } from "./service";
