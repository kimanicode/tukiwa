import { Worker } from "bullmq";
import { getBullConnection } from "../../../jobs/mpesa-callback.queue";
import { MerryGoRoundService } from "./service";

export const rotationReminderQueueName = "rotation-reminders";

export function startRotationReminderWorker() {
  return new Worker(
    rotationReminderQueueName,
    async () => {
      await new MerryGoRoundService().sendOverdueReminders();
    },
    { connection: getBullConnection() }
  );
}
