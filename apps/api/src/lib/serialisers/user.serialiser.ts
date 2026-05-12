import type { User } from "@prisma/client";
import { maskNationalId } from "../crypto/national-id";
import { maskPhone } from "../log-sanitiser";

export type SafeUser = {
  id: string;
  phone: string;
  fullName: string;
  nationalId: string | null;
  kycVerified: boolean;
  isProfileComplete: boolean;
  isPhoneVerified: boolean;
  hasPinSet: boolean;
  createdAt: Date;
};

export function serialiseUser(user: User): SafeUser {
  return {
    id: user.id,
    phone: maskPhone(user.phone),
    fullName: user.fullName,
    nationalId: user.nationalId ? maskNationalId(user.nationalId) : null,
    kycVerified: user.kycVerified,
    isProfileComplete: user.isProfileComplete,
    isPhoneVerified: user.isPhoneVerified,
    hasPinSet: Boolean(user.pinHash),
    createdAt: user.createdAt
  };
}
