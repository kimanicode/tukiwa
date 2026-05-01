import { ContributionStatus, MemberRole } from "@prisma/client";
import { Worker } from "bullmq";
import { prisma as defaultPrisma } from "../lib/prisma";
import { Channel, NotificationEvent, NotificationService } from "../modules/notifications";
import { getBullConnection } from "./mpesa-callback.queue";
import { notificationQueueNames } from "./notification-schedules";

export async function processOverdueAlerts(
  deps: { prisma?: any; notifications?: NotificationService; now?: () => Date } = {}
) {
  const prisma = deps.prisma ?? defaultPrisma;
  const notifications = deps.notifications ?? new NotificationService();
  const now = deps.now?.() ?? new Date();
  const contributions = await prisma.contribution.findMany({
    where: { status: ContributionStatus.PENDING, dueDate: { lt: now } },
    include: { member: { include: { user: true } }, chama: { include: { members: { include: { user: true } } } } }
  });

  for (const contribution of contributions) {
    await notifications.send(
      contribution.member.userId,
      NotificationEvent.OVERDUE_ALERT,
      { chamaId: contribution.chamaId, contributionId: contribution.id, amount: contribution.amount },
      [Channel.PUSH, Channel.SMS]
    );
    for (const member of contribution.chama.members.filter((member: any) => member.role === MemberRole.TREASURER && member.isActive)) {
      await notifications.send(
        member.userId,
        NotificationEvent.OVERDUE_ALERT,
        { chamaId: contribution.chamaId, contributionId: contribution.id, memberId: contribution.memberId },
        [Channel.WEBSOCKET]
      );
    }
  }
  return { count: contributions.length };
}

export function startOverdueAlertWorker() {
  return new Worker(notificationQueueNames.overdueAlert, async () => processOverdueAlerts(), {
    connection: getBullConnection()
  });
}
