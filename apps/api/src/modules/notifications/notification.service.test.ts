import { describe, expect, it } from "vitest";
import { Channel, NotificationEvent, NotificationService } from "./notification.service";

class FakeExpo {
  sent: unknown[] = [];
  chunkPushNotifications(messages: unknown[]) {
    return [messages];
  }
  async sendPushNotificationsAsync(messages: unknown[]) {
    this.sent.push(...messages);
    return [{ status: "ok", id: "receipt-1" }];
  }
  chunkPushNotificationReceiptIds(ids: string[]) {
    return [ids];
  }
  async getPushNotificationReceiptsAsync() {
    return { "receipt-1": { status: "ok" } };
  }
}

describe("NotificationService", () => {
  it("fans out to SMS, push, user websocket, and chama websocket", async () => {
    const sms: string[] = [];
    const userEvents: unknown[] = [];
    const chamaEvents: unknown[] = [];
    const expo = new FakeExpo();
    const service = new NotificationService({
      prisma: {
        user: {
          findUnique: async () => ({
            id: "user-1",
            phone: "254712345678",
            pushToken: "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]",
            whatsappOptIn: true
          })
        }
      },
      expo: expo as never,
      sendSms: async (phone, message) => {
        sms.push(`${phone}:${message}`);
      },
      emitUser: (_userId, event) => userEvents.push(event),
      emitChama: (_chamaId, event) => chamaEvents.push(event)
    });

    await service.send(
      "user-1",
      NotificationEvent.CONTRIBUTION_CONFIRMED,
      { chamaId: "chama-1", amount: 1000 },
      [Channel.SMS, Channel.PUSH, Channel.WEBSOCKET]
    );

    expect(sms).toHaveLength(1);
    expect(expo.sent).toHaveLength(1);
    expect(userEvents).toHaveLength(1);
    expect(chamaEvents).toHaveLength(1);
  });

  it("sends WhatsApp only when the user opted in", async () => {
    const whatsapp: string[] = [];
    const service = new NotificationService({
      prisma: {
        user: {
          findUnique: async () => ({
            id: "user-1",
            phone: "254712345678",
            pushToken: null,
            whatsappOptIn: true
          })
        }
      },
      sendWhatsApp: async (phone, message) => {
        whatsapp.push(`${phone}:${message}`);
      }
    });

    await service.send(
      "user-1",
      NotificationEvent.PAYOUT_SENT,
      { amount: 5000 },
      [Channel.WHATSAPP]
    );

    expect(whatsapp).toHaveLength(1);
  });
});
