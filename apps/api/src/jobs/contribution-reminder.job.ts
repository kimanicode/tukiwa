import { ContributionStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { prisma as defaultPrisma } from "../lib/prisma";
import { Channel, NotificationEvent, NotificationService } from "../modules/notifications";
import { getBullConnection } from "./mpesa-callback.queue";
import { notificationQueueNames } from "./notification-schedules";

export async function processContributionReminders(
  deps: { prisma?: any; notifications?: NotificationService; now?: () => Date } = {}
) {
  const prisma = deps.prisma ?? defaultPrisma;
  const notifications = deps.notifications ?? new NotificationService();
  const now = deps.now?.() ?? new Date();
  const due = new Date(now);
  due.setDate(now.getDate() + 2);
  const start = new Date(due);
  start.setHours(0, 0, 0, 0);
  const end = new Date(due);
  end.setHours(23, 59, 59, 999);

  const contributions = await prisma.contribution.findMany({
    where: { status: ContributionStatus.PENDING, dueDate: { gte: start, lte: end } },
    include: { member: { include: { user: true } } }
  });
  await Promise.all(
    contributions.map((contribution: any) =>
      notifications.send(
        contribution.member.userId,
        NotificationEvent.CONTRIBUTION_REMINDER,
        { chamaId: contribution.chamaId, contributionId: contribution.id, amount: contribution.amount },
        [Channel.PUSH, Channel.SMS]
      )
    )
  );
  return { count: contributions.length };
}

export function startContributionReminderWorker() {
  return new Worker(
    notificationQueueNames.contributionReminder,
    async () => processContributionReminders(),
    { connection: getBullConnection() }
  );
}
