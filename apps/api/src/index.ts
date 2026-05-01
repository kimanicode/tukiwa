import fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyWebsocket from "@fastify/websocket";
import authRoutes from "./modules/auth";
import chamaRoutes from "./modules/chamas";
import contributionRoutes from "./modules/contributions";
import investmentRoutes from "./modules/engines/investment";
import merryGoRoundRoutes from "./modules/engines/merry-go-round";
import tableBankingRoutes from "./modules/engines/table-banking";
import feeRoutes from "./modules/fees/fees.routes";
import loanRoutes from "./modules/loans";
import memberRoutes from "./modules/members";
import { setChamaBroadcaster, setUserBroadcaster } from "./lib/websocket";
import whatsappRoutes from "./modules/notifications/whatsapp.routes";
import {
  scheduleNotificationJobs,
  startContributionReminderWorker,
  startLoanRepaymentReminderWorker,
  startMpesaCallbackWorker,
  startOverdueAlertWorker
} from "./jobs";

export function buildApi() {
  const app = fastify({ logger: true });
  const chamaRooms = new Map<string, Set<{ send: (payload: string) => void }>>();
  const userRooms = new Map<string, Set<{ send: (payload: string) => void }>>();

  app.register(fastifyWebsocket);
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "development-secret-change-me"
  });
  app.register(async (websocketRoutes) => {
    websocketRoutes.get("/ws/chamas/:id", { websocket: true }, (connection, request) => {
      const { id } = request.params as { id: string };
      const room = chamaRooms.get(id) ?? new Set();
      room.add(connection.socket);
      chamaRooms.set(id, room);
      connection.socket.on("close", () => {
        room.delete(connection.socket);
      });
    });
    websocketRoutes.get("/ws/users/:id", { websocket: true }, (connection, request) => {
      const { id } = request.params as { id: string };
      const room = userRooms.get(id) ?? new Set();
      room.add(connection.socket);
      userRooms.set(id, room);
      connection.socket.on("close", () => {
        room.delete(connection.socket);
      });
    });
  });

  setChamaBroadcaster((chamaId, event) => {
    const payload = JSON.stringify(event);
    for (const socket of chamaRooms.get(chamaId) ?? []) {
      socket.send(payload);
    }
  });
  setUserBroadcaster((userId, event) => {
    const payload = JSON.stringify(event);
    for (const socket of userRooms.get(userId) ?? []) {
      socket.send(payload);
    }
  });

  app.register(authRoutes);
  app.register(chamaRoutes);
  app.register(contributionRoutes);
  app.register(loanRoutes);
  app.register(merryGoRoundRoutes);
  app.register(tableBankingRoutes);
  app.register(investmentRoutes);
  app.register(memberRoutes);
  app.register(whatsappRoutes);
  app.register(feeRoutes);

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = buildApi();
  const workers = [
    startMpesaCallbackWorker(),
    startContributionReminderWorker(),
    startOverdueAlertWorker(),
    startLoanRepaymentReminderWorker()
  ];
  scheduleNotificationJobs().catch((error) => app.log.error(error));
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? "0.0.0.0";

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      app.log.error({ jobId: job?.id, error }, "Background job failed");
    });
  }

  app.listen({ port, host }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
