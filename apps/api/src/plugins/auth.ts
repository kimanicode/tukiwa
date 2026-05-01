import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser } from "../modules/auth/service";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = await request.jwtVerify<AuthUser>();
    request.user = {
      id: user.id,
      phone: user.phone
    };
  } catch {
    reply.status(401).send({ message: "Unauthorized" });
  }
}
