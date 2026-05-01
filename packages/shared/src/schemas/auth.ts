import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z.string().min(9).max(16)
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(9).max(16),
  code: z.string().regex(/^\d{6}$/)
});

export const devLoginSchema = z.object({
  phone: z.string().min(9).max(16),
  fullName: z.string().trim().min(2).max(120)
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type DevLoginInput = z.infer<typeof devLoginSchema>;
