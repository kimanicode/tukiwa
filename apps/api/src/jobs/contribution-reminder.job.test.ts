import { ContributionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { processContributionReminders } from "./contribution-reminder.job";

describe("processContributionReminders", () => {
  it("sends reminder notifications for contributions due in two days", async () => {
    const sent: unknown[] = [];
    const result = await processContributionReminders({
      now: () => new Date("2026-04-30T05:00:00.000Z"),
      prisma: {
        contribution: {
          findMany: async () => [
            {
              id: "contribution-1",
              chamaId: "chama-1",
              amount: 1000,
              status: ContributionStatus.PENDING,
              member: { userId: "user-1", user: { id: "user-1" } }
            }
          ]
        }
      },
      notifications: {
        send: async (...args: unknown[]) => {
          sent.push(args);
        }
      } as never
    });

    expect(result).toEqual({ count: 1 });
    expect(sent).toHaveLength(1);
  });
});
