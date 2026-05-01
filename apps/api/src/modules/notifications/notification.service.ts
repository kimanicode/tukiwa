import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { prisma as defaultPrisma } from "../../lib/prisma";
import { sendSms as defaultSendSms } from "../../lib/sms";
import { sendMessage as defaultSendWhatsApp } from "../../lib/whatsapp";
import { emitChamaEvent, emitUserEvent } from "../../lib/websocket";

export enum Channel {
  WEBSOCKET = "WEBSOCKET",
  PUSH = "PUSH",
  SMS = "SMS",
  WHATSAPP = "WHATSAPP"
}

export enum NotificationEvent {
  CONTRIBUTION_CONFIRMED = "CONTRIBUTION_CONFIRMED",
  LOAN_APPROVED = "LOAN_APPROVED",
  LOAN_DISBURSED = "LOAN_DISBURSED",
  PAYOUT_SENT = "PAYOUT_SENT",
  CONTRIBUTION_REMINDER = "CONTRIBUTION_REMINDER",
  OVERDUE_ALERT = "OVERDUE_ALERT",
  REPAYMENT_REMINDER = "REPAYMENT_REMINDER"
}

type UserRecord = {
  id: string;
  phone: string;
  pushToken: string | null;
  whatsappOptIn: boolean;
};

type PrismaLike = {
  user: {
    findUnique(args: unknown): Promise<UserRecord | null>;
  };
};

export class NotificationService {
  private readonly expo: Expo;

  constructor(
    private readonly deps: {
      prisma?: PrismaLike;
      sendSms?: (phone: string, message: string) => Promise<void>;
      sendWhatsApp?: (phone: string, message: string) => Promise<void>;
      emitUser?: typeof emitUserEvent;
      emitChama?: typeof emitChamaEvent;
      expo?: Expo;
    } = {}
  ) {
    this.expo = deps.expo ?? new Expo();
  }

  async send(
    userId: string,
    event: NotificationEvent,
    data: Record<string, unknown>,
    channels: Channel[]
  ): Promise<void> {
    const prisma = this.deps.prisma ?? defaultPrisma;
    if (!prisma.user?.findUnique) return;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, pushToken: true, whatsappOptIn: true }
    });
    if (!user) return;

    await Promise.allSettled(
      channels.map(async (channel) => {
        if (channel === Channel.WEBSOCKET) {
          this.emitWebsocket(user.id, event, data);
          return;
        }
        if (channel === Channel.PUSH) {
          await this.sendPush(user, event, data);
          return;
        }
        if (channel === Channel.SMS) {
          await (this.deps.sendSms ?? defaultSendSms)(user.phone, formatSms(event, data));
          return;
        }
        if (channel === Channel.WHATSAPP && user.whatsappOptIn) {
          await (this.deps.sendWhatsApp ?? defaultSendWhatsApp)(user.phone, formatSms(event, data));
        }
      })
    );
  }

  private emitWebsocket(
    userId: string,
    event: NotificationEvent,
    data: Record<string, unknown>
  ): void {
    const payload = { type: event, payload: data };
    (this.deps.emitUser ?? emitUserEvent)(userId, payload);
    const chamaId = data.chamaId;
    if (typeof chamaId === "string") {
      (this.deps.emitChama ?? emitChamaEvent)(chamaId, payload);
    }
  }

  private async sendPush(
    user: UserRecord,
    event: NotificationEvent,
    data: Record<string, unknown>
  ): Promise<void> {
    if (!user.pushToken || !Expo.isExpoPushToken(user.pushToken)) return;
    const messages: ExpoPushMessage[] = [
      {
        to: user.pushToken,
        sound: "default",
        title: pushTitle(event),
        body: formatSms(event, data),
        data: { event, ...data }
      }
    ];

    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      await this.handleTickets(tickets);
    }
  }

  private async handleTickets(tickets: ExpoPushTicket[]): Promise<void> {
    const receiptIds = tickets
      .filter((ticket): ticket is ExpoPushTicket & { id: string } => ticket.status === "ok")
      .map((ticket) => ticket.id);

    for (const errorTicket of tickets.filter((ticket) => ticket.status === "error")) {
      console.warn("Expo push ticket error", errorTicket);
    }

    for (const chunk of this.expo.chunkPushNotificationReceiptIds(receiptIds)) {
      const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
      for (const receipt of Object.values(receipts)) {
        if (receipt.status === "error") {
          console.warn("Expo push receipt error", receipt);
        }
      }
    }
  }
}

function pushTitle(event: NotificationEvent): string {
  return event
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSms(event: NotificationEvent, data: Record<string, unknown>): string {
  const amount = typeof data.amount === "number" ? ` KES ${(data.amount / 100).toFixed(2)}` : "";
  switch (event) {
    case NotificationEvent.CONTRIBUTION_CONFIRMED:
      return `Your Tukiwa contribution${amount} has been confirmed.`;
    case NotificationEvent.LOAN_APPROVED:
      return `Your Tukiwa loan${amount} has been approved.`;
    case NotificationEvent.LOAN_DISBURSED:
      return `Your Tukiwa loan${amount} has been disbursed.`;
    case NotificationEvent.PAYOUT_SENT:
      return `Your Tukiwa payout${amount} has been sent.`;
    case NotificationEvent.CONTRIBUTION_REMINDER:
      return "Reminder: your Tukiwa contribution is due soon.";
    case NotificationEvent.OVERDUE_ALERT:
      return "Alert: your Tukiwa contribution is overdue.";
    case NotificationEvent.REPAYMENT_REMINDER:
      return "Reminder: your Tukiwa loan repayment is due soon.";
    default:
      return "You have a Tukiwa notification.";
  }
}
