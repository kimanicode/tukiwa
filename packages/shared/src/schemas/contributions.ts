import { z } from "zod";

export const initiateContributionSchema = z.object({
  amount: z.number().int().positive(),
  dueDate: z.string().datetime().optional()
});

export const contributionFiltersSchema = z.object({
  memberId: z.string().optional(),
  status: z.enum(["PENDING", "PAID", "LATE", "WAIVED"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

export type InitiateContributionInput = z.infer<typeof initiateContributionSchema>;
export type ContributionFiltersInput = z.infer<typeof contributionFiltersSchema>;
