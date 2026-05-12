import type { FastifyPluginAsync } from "fastify";
import {
  devLoginSchema,
  requestOtpSchema,
  resetPinSchema,
  setPinSchema,
  setupProfileSchema,
  verifyOtpSchema,
  verifyPinSchema
} from "@chama/shared";
import { z } from "zod";
import { requireAuth } from "../../plugins/auth";
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

  fastify.get("/auth/phone-status", async (request, reply) => {
    const query = requestOtpSchema.parse(request.query);
    const response = await service.getPhoneStatus(query.phone);
    return reply.send(response);
  });

  fastify.post("/auth/verify-pin", async (request, reply) => {
    const body = verifyPinSchema.parse(request.body);
    const response = await service.verifyPinLogin(body.phone, body.pin);
    return reply.send(response);
  });

  fastify.get("/auth/biometric-challenge", async (request, reply) => {
    const query = requestOtpSchema.parse(request.query);
    const response = await service.createBiometricChallenge(query.phone);
    return reply.send(response);
  });

  fastify.post("/auth/biometric-verify", async (request, reply) => {
    const body = biometricVerifySchema.parse(request.body);
    const response = await service.verifyBiometric(body.phone, body.biometricToken);
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

  fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook("preHandler", requireAuth);

    protectedRoutes.post("/auth/setup-profile", async (request, reply) => {
      const body = setupProfileSchema.parse(request.body);
      const response = await service.setupProfile(request.user.id, body);
      return reply.send(response);
    });

    protectedRoutes.post("/auth/set-pin", async (request, reply) => {
      const body = setPinSchema.parse(request.body);
      const response = await service.setPin(request.user.id, body);
      return reply.send(response);
    });

    protectedRoutes.post("/auth/reset-pin", async (request, reply) => {
      const body = resetPinSchema.parse(request.body);
      const response = await service.setPin(request.user.id, body, "PIN_RESET");
      return reply.send(response);
    });

    protectedRoutes.get("/auth/status", async (request, reply) => {
      const response = await service.getAuthStatus(request.user.id);
      return reply.send(response);
    });
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

const biometricVerifySchema = z.object({
  phone: z.string().min(9).max(16),
  biometricToken: z.string().uuid()
});

export default authRoutes;
export { AuthService, normalizeKenyanPhone, AuthError } from "./service";
