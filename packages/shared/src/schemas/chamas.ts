import { z } from "zod";

export const chamaTypeSchema = z.enum(["MERRY_GO_ROUND", "TABLE_BANKING", "INVESTMENT"]);

export const memberRoleSchema = z.enum([
  "ADMIN",
  "TREASURER",
  "SECRETARY",
  "MEMBER"
]);

export const createChamaSchema = z.object({
  name: z.string().min(2).max(120),
  type: chamaTypeSchema,
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional()
});

export const contributionCycleSchema = z.enum([
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY"
]);

export const updateChamaSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    logoUrl: z.string().url().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export const updateChamaSettingsSchema = z
  .object({
    contributionAmount: z.number().int().min(0).optional(),
    contributionCycle: contributionCycleSchema.optional(),
    loanInterestRate: z.number().min(0).optional(),
    maxLoanMultiplier: z.number().min(0).optional(),
    penaltyRate: z.number().min(0).optional(),
    requiresMeetingForLoan: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one settings field is required"
  });

export const inviteMemberSchema = z.object({
  phone: z.string().min(9).max(16)
});

export const updateMemberRoleSchema = z.object({
  role: memberRoleSchema
});

export const updateMeSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    pushToken: z.string().min(1).max(512).nullable().optional(),
    whatsappOptIn: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export type CreateChamaInput = z.infer<typeof createChamaSchema>;
export type UpdateChamaInput = z.infer<typeof updateChamaSchema>;
export type UpdateChamaSettingsInput = z.infer<typeof updateChamaSettingsSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
