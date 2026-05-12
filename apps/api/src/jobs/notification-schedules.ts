import { Queue } from "bullmq";
import { getBullConnection } from "./mpesa-callback.queue";

export const notificationQueueNames = {
  contributionReminder: "contribution-reminder",
  overdueAlert: "overdue-alert",
  repaymentReminder: "loan-repayment-reminder",
  proposalExpiry: "proposal-expiry"
} as const;

export function createNotificationQueue(name: string) {
  return new Queue(name, { connection: getBullConnection() });
}

export async function scheduleNotificationJobs(): Promise<void> {
  await createNotificationQueue(notificationQueueNames.contributionReminder).add(
    "daily",
    {},
    { repeat: { pattern: "0 8 * * *", tz: "Africa/Nairobi" }, jobId: "daily-8am-eat" }
  );
  await createNotificationQueue(notificationQueueNames.overdueAlert).add(
    "daily",
    {},
    { repeat: { pattern: "0 9 * * *", tz: "Africa/Nairobi" }, jobId: "daily-9am-eat" }
  );
  await createNotificationQueue(notificationQueueNames.repaymentReminder).add(
    "daily",
    {},
    { repeat: { pattern: "0 8 * * *", tz: "Africa/Nairobi" }, jobId: "daily-loan-reminders" }
  );
  await createNotificationQueue(notificationQueueNames.proposalExpiry).add(
    "hourly",
    {},
    { repeat: { pattern: "0 * * * *", tz: "Africa/Nairobi" }, jobId: "hourly-proposal-expiry" }
  );
}
