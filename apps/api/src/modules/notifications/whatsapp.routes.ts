import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { parseInbound, sendMessage } from "../../lib/whatsapp";
import { handleWhatsAppCommand } from "../../lib/whatsapp/commands";

const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/whatsapp/webhook", async (request, reply) => {
    if (!isValidSignature(request.body, request.headers)) {
      return reply.status(401).send({ message: "Invalid signature" });
    }
    const inbound = parseInbound(request.body);
    void handleWhatsAppCommand(inbound.from, inbound.body)
      .then((message) => sendMessage(inbound.from, message))
      .catch((error) => request.log.error(error));
    return reply.status(200).send({ message: "accepted" });
  });
};

export default whatsappRoutes;

function isValidSignature(payload: unknown, headers: Record<string, unknown>): boolean {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = header(headers, "x-whatsapp-signature") ?? header(headers, "x-hub-signature-256");
  if (!signature) return false;
  const expected = createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  const received = signature.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function header(headers: Record<string, unknown>, name: string): string | undefined {
  const value = headers[name];
  return typeof value === "string" ? value : undefined;
}
