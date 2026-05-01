import { LoanStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { prisma as defaultPrisma } from "../lib/prisma";
import { Channel, NotificationEvent, NotificationService } from "../modules/notifications";
import { getBullConnection } from "./mpesa-callback.queue";
import { notificationQueueNames } from "./notification-schedules";

export async function processLoanRepaymentReminders(
  deps: { prisma?: any; notifications?: NotificationService; now?: () => Date } = {}
) {
  const prisma = deps.prisma ?? defaultPrisma;
  const notifications = deps.notifications ?? new NotificationService();
  const now = deps.now?.() ?? new Date();
  const due = new Date(now);
  due.setDate(now.getDate() + 3);
  const start = new Date(due);
  start.setHours(0, 0, 0, 0);
  const end = new Date(due);
  end.setHours(23, 59, 59, 999);

  const loans = await prisma.loan.findMany({
    where: { status: LoanStatus.DISBURSED, dueDate: { gte: start, lte: end } },
    include: { borrower: true }
  });
  await Promise.all(
    loans.map((loan: any) =>
      notifications.send(
        loan.borrowerId,
        NotificationEvent.REPAYMENT_REMINDER,
        { chamaId: loan.chamaId, loanId: loan.id, amount: loan.totalDue },
        [Channel.PUSH, Channel.SMS]
      )
    )
  );
  return { count: loans.length };
}

export function startLoanRepaymentReminderWorker() {
  return new Worker(
    notificationQueueNames.repaymentReminder,
    async () => processLoanRepaymentReminders(),
    { connection: getBullConnection() }
  );
}
