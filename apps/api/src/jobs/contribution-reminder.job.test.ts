import { ContributionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { processContributionReminders } from "./contribution-reminder.job";

describe("processContributionReminders", () => {
  it("sends reminder notifications for pending contributions due tomorrow", async () => {
    const sent: unknown[] = [];
    const queries: unknown[] = [];
    const result = await processContributionReminders({
      now: () => new Date("2026-04-30T05:00:00.000Z"),
      prisma: {
        contribution: {
          findMany: async (query: unknown) => {
            queries.push(query);
            return [
              {
                id: "contribution-1",
                chamaId: "chama-1",
                amount: 1000,
                status: ContributionStatus.PENDING,
                dueDate: new Date("2026-05-01T10:00:00.000Z"),
                chama: { name: "Umoja Sisters" },
                member: { userId: "user-1", user: { id: "user-1" } }
              }
            ];
          }
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
    expect(queries[0]).toMatchObject({
      where: {
        status: ContributionStatus.PENDING,
        dueDate: {
          gte: new Date("2026-04-30T21:00:00.000Z"),
          lte: new Date("2026-05-01T20:59:59.999Z")
        }
      }
    });
  });
});
