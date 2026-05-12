import { ContributionStatus } from "@prisma/client";
import { Worker } from "bullmq";
import type { C2BCallbackPayload } from "../lib/mpesa";
import { maskPhone } from "../lib/log-sanitiser";
import { prisma as defaultPrisma } from "../lib/prisma";
import { emitChamaEvent } from "../lib/websocket";
import { Channel, NotificationEvent, NotificationService } from "../modules/notifications";
import { settleFee, voidFee } from "../modules/fees/fee.service";
import { normalizeKenyanPhone } from "../modules/auth/service";
import {
  getBullConnection,
  type MpesaCallbackJobData,
  mpesaCallbackQueueName
} from "./mpesa-callback.queue";

type PrismaLike = Pick<
  typeof defaultPrisma,
  "chama" | "chamaMember" | "contribution" | "auditLog" | "platformFee" | "user" | "$transaction"
>;

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

export async function processC2BCallback(
  payload: C2BCallbackPayload,
  deps: { prisma?: PrismaLike; emit?: typeof emitChamaEvent; notifications?: NotificationService } = {}
) {
  const prisma = deps.prisma ?? defaultPrisma;
  const emit = deps.emit ?? emitChamaEvent;

  const existing = await prisma.contribution.findFirst({
    where: { mpesaReceiptNum: payload.TransID }
  });
  if (existing) {
    console.info("Duplicate C2B callback ignored", { transId: payload.TransID });
    return { processed: false, reason: "duplicate" };
  }

  const chama = await prisma.chama.findFirst({
    where: { mpesaAccountRef: payload.BillRefNumber }
  });

  if (!chama) {
    console.warn("C2B callback with unknown BillRefNumber", {
      billRefNumber: payload.BillRefNumber,
      transId: payload.TransID,
      amount: payload.TransAmount,
      phone: maskPhone(payload.MSISDN)
    });
    await prisma.auditLog.create({
      data: {
        action: "C2B_UNKNOWN_REF",
        entity: "mpesa_callback",
        entityId: payload.TransID,
        meta: { billRefNumber: payload.BillRefNumber, msisdn: maskPhone(payload.MSISDN) }
      }
    });
    return { processed: false, reason: "unknown_bill_ref" };
  }

  const phone = normalizeKenyanPhone(payload.MSISDN);
  const member = await prisma.chamaMember.findFirst({
    where: {
      chamaId: chama.id,
      user: { phone }
    },
    include: { user: true }
  });
  const amountCents = Math.round(Number.parseFloat(payload.TransAmount) * 100);

  const contribution = await prisma.contribution.findFirst({
    where: {
      chamaId: chama.id,
      memberId: member?.id,
      status: ContributionStatus.PENDING,
      amount: amountCents
    }
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (contribution) {
      const paid = await tx.contribution.update({
        where: { id: contribution.id },
        data: {
          status: ContributionStatus.PAID,
          paidAt: new Date(),
          mpesaReceiptNum: payload.TransID,
          billRefNumber: payload.BillRefNumber
        }
      });

      await tx.auditLog.create({
        data: {
          chamaId: chama.id,
          actorId: member?.userId ?? null,
          action: "C2B_CONTRIBUTION_CONFIRMED",
          entity: "contribution",
          entityId: paid.id,
          meta: {
            transId: payload.TransID,
            amount: amountCents,
            phone: maskPhone(payload.MSISDN),
            billRefNumber: payload.BillRefNumber
          }
        }
      });

      return paid;
    }

    const paid = await tx.contribution.create({
      data: {
        chamaId: chama.id,
        memberId: member?.id ?? null,
        amount: amountCents,
        status: ContributionStatus.PAID,
        paidAt: new Date(),
        mpesaReceiptNum: payload.TransID,
        billRefNumber: payload.BillRefNumber,
        dueDate: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        chamaId: chama.id,
        actorId: member?.userId ?? null,
        action: "C2B_CONTRIBUTION_CONFIRMED",
        entity: "contribution",
        entityId: paid.id,
        meta: {
          transId: payload.TransID,
          amount: amountCents,
          phone: maskPhone(payload.MSISDN),
          billRefNumber: payload.BillRefNumber
        }
      }
    });

    return paid;
  });

  if (contribution) {
    await settleFee(prisma, contribution.id);
  }

  emit(chama.id, {
    type: "contribution.updated",
    payload: updated
  });

  if (member?.userId) {
    await (deps.notifications ?? new NotificationService()).send(
      member.userId,
      NotificationEvent.CONTRIBUTION_CONFIRMED,
      {
        chamaId: chama.id,
        chamaName: chama.name,
        amount: amountCents,
        receiptNumber: payload.TransID
      },
      [Channel.WEBSOCKET, Channel.PUSH, Channel.WHATSAPP]
    );
  }

  return { processed: true, contributionId: updated.id };
}

export function startMpesaCallbackWorker() {
  return new Worker<MpesaCallbackJobData>(
    mpesaCallbackQueueName,
    async (job) => {
      if ("c2bCallback" in job.data) {
        return processC2BCallback(job.data.c2bCallback);
      }
      return processMpesaCallback(job.data);
    },
    { connection: getBullConnection() }
  );
}
