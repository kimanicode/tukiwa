import { ContributionStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { prisma as defaultPrisma } from "../lib/prisma";
import { emitChamaEvent } from "../lib/websocket";
import { Channel, NotificationEvent, NotificationService } from "../modules/notifications";
import { settleFee, voidFee } from "../modules/fees/fee.service";
import {
  getBullConnection,
  type MpesaCallbackJobData,
  mpesaCallbackQueueName
} from "./mpesa-callback.queue";

type PrismaLike = Pick<typeof defaultPrisma, "contribution" | "auditLog" | "platformFee" | "$transaction">;

export async function processMpesaCallback(
  data: MpesaCallbackJobData,
  deps: { prisma?: PrismaLike; emit?: typeof emitChamaEvent; notifications?: NotificationService } = {}
) {
  const prisma = deps.prisma ?? defaultPrisma;
  const emit = deps.emit ?? emitChamaEvent;
  const callback = data.callback;

  const contribution = await prisma.contribution.findUnique({
    where: { mpesaRef: callback.checkoutRequestId }
  });

  if (!contribution) {
    return { processed: false, reason: "contribution_not_found" };
  }

  if (contribution.status === ContributionStatus.PAID) {
    return { processed: false, reason: "already_processed" };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.contribution.findUnique({
      where: { mpesaRef: callback.checkoutRequestId }
    });

    if (!fresh || fresh.status === ContributionStatus.PAID) {
      return null;
    }

    const status =
      callback.resultCode === 0 ? ContributionStatus.PAID : ContributionStatus.PENDING;

    const updatedContribution = await tx.contribution.update({
      where: { id: fresh.id },
      data: {
        status,
        mpesaReceiptNum: callback.receiptNumber ?? fresh.mpesaReceiptNum,
        paidAt: status === ContributionStatus.PAID ? new Date() : fresh.paidAt
      }
    });

    await tx.auditLog.create({
      data: {
        chamaId: fresh.chamaId,
        action: "MPESA_CALLBACK_PROCESSED",
        entity: "Contribution",
        entityId: fresh.id,
        meta: {
          checkoutRequestId: callback.checkoutRequestId,
          resultCode: callback.resultCode,
          resultDesc: callback.resultDesc,
          receiptNumber: callback.receiptNumber
        }
      }
    });

    if (callback.resultCode === 0) {
      await settleFee(tx, fresh.id);
    } else {
      await voidFee(tx, fresh.id);
    }

    return updatedContribution;
  });

  if (!updated) {
    return { processed: false, reason: "already_processed" };
  }

  emit(updated.chamaId, {
    type: "contribution.updated",
    payload: updated
  });
  const recipient = await prisma.contribution.findUnique({
    where: { id: updated.id },
    include: { member: true }
  } as never);
  if ((recipient as any)?.member?.userId) {
    await (deps.notifications ?? new NotificationService()).send(
      (recipient as any).member.userId,
      NotificationEvent.CONTRIBUTION_CONFIRMED,
      { chamaId: updated.chamaId, contributionId: updated.id, amount: updated.amount },
      [Channel.WEBSOCKET, Channel.PUSH, Channel.SMS, Channel.WHATSAPP]
    );
  }

  return { processed: true, contributionId: updated.id };
}

export function startMpesaCallbackWorker() {
  return new Worker<MpesaCallbackJobData>(
    mpesaCallbackQueueName,
    async (job) => processMpesaCallback(job.data),
    { connection: getBullConnection() }
  );
}
