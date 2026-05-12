import { z } from "zod";

export const requestOtpSchema = z.object({
  phone: z.string().min(9).max(16)
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(9).max(16),
  code: z.string().regex(/^\d{6}$/)
});

export const setupProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  nationalId: z.string().regex(/^\d{8}$/, "National ID must be exactly 8 digits")
});

export const setPinSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits")
  })
  .refine((value) => value.pin === value.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"]
  });

export const verifyPinSchema = z.object({
  phone: z.string().min(9).max(16),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits")
});

export const resetPinSchema = setPinSchema;

export const devLoginSchema = z.object({
  phone: z.string().min(9).max(16),
  fullName: z.string().trim().min(2).max(120)
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SetupProfileInput = z.infer<typeof setupProfileSchema>;
export type SetPinInput = z.infer<typeof setPinSchema>;
export type VerifyPinInput = z.infer<typeof verifyPinSchema>;
export type ResetPinInput = z.infer<typeof resetPinSchema>;
export type DevLoginInput = z.infer<typeof devLoginSchema>;
