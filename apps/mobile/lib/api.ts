import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import type {
  ApplyLoanInput,
  DevLoginInput,
  GovernanceSettingsInput,
  InitiateContributionInput,
  RequestOtpInput,
  ResetPinInput,
  SetPinInput,
  SetupProfileInput,
  UpdateChamaInput,
  UpdateChamaSettingsInput,
  VerifyOtpInput,
  VerifyPinInput
} from "@chama/shared";
import {
  createChamaSchema,
  governanceSettingsSchema,
  inviteMemberSchema,
  resetPinSchema,
  setPinSchema,
  setupProfileSchema,
  updateChamaSettingsSchema,
  updateChamaSchema,
  verifyPinSchema
} from "@chama/shared";
import { z } from "zod";
import { useAuthStore } from "../stores/auth.store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type User = {
  id: string;
  phone: string;
  fullName: string;
  nationalId?: string | null;
  pushToken?: string | null;
  kycVerified?: boolean;
  isPhoneVerified?: boolean;
  isProfileComplete?: boolean;
  hasPinSet?: boolean;
};

export type AuthResponse = { accessToken: string; refreshToken: string; user: User };
export type AuthStatusResponse = {
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  hasPinSet: boolean;
  user: User;
};
export type PhoneStatusResponse = {
  isNewUser: boolean;
  hasPinSet: boolean;
  isPhoneVerified: boolean;
  fullName: string | null;
};

export type Chama = {
  id: string;
  name: string;
  type: "MERRY_GO_ROUND" | "TABLE_BANKING" | "INVESTMENT";
  mpesaAccountRef?: string;
  description?: string | null;
  logoUrl?: string | null;
  poolBalance?: number;
  settings?: {
    id?: string;
    chamaId?: string;
    contributionAmount: number;
    contributionCycle: string;
    loanInterestRate: number;
    maxLoanMultiplier: number;
    penaltyRate: number;
    requiresMeetingForLoan: boolean;
    votingRule?: string;
    withdrawalPolicy?: string;
    memberExitPolicy?: string;
    refundPolicy?: string;
    disputeResolutionMethod?: string;
    meetingFrequency?: string;
    recordVisibility?: string;
    treasuryEnabled?: boolean;
    requiredApprovals?: number;
    proposalThresholdCents?: number;
  } | null;
  members?: Array<{
    id: string;
    role: string;
    shares: number;
    user: User;
  }>;
};

export type CreateChamaRequest = z.infer<typeof createChamaSchema>;
export type ChamaResponse = Chama;
export type InviteMemberRequest = z.infer<typeof inviteMemberSchema>;

export type MyChama = {
  chama: Chama;
  role: string;
  nextContributionDue: string | null;
  memberCount?: number;
  cycleProgress?: number;
  cycleTarget?: number;
  nextPayoutLabel?: string;
};

export type HomeSummary = {
  poolBalance?: number;
  walletBalance?: number;
  chamaBalance: number;
  totalBalance: number;
  nextAction: {
    type: "CONTRIBUTION";
    chamaId: string;
    chamaName: string;
    amount: number;
    dueDate: string;
    title: string;
  } | null;
  chamas: MyChama[];
  insights: {
    monthlySaved: number;
    activeLoan: number;
    investmentReturnPct: number;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    source: string;
    date: string;
    amount: number;
    direction: "income" | "expense";
  }>;
};

export type Contribution = {
  id: string;
  chamaId: string;
  memberId: string;
  amount: number;
  status: "PENDING" | "PAID" | "LATE" | "WAIVED";
  dueDate: string;
  paidAt?: string | null;
  member?: { user?: User };
};

export type Loan = {
  id: string;
  amount: number;
  totalDue: number;
  status: string;
  dueDate?: string | null;
  outstandingBalance?: number;
  repayments?: Array<{ id: string; amount: number; paidAt: string }>;
};

export type Investment = {
  name: string;
  type: string;
  amountInvested: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
};

export type Rotation = {
  id: string;
  position: number;
  scheduledAt: string;
  status: string;
  member?: { user?: User };
};

export type FeePreview = {
  feeAmount: number;
  netAmount: number;
  chargeAmount: number;
  feeRate: number;
  deductionModel: "on_top" | "deducted" | "split_payments";
  note?: string;
};

export type FundsSummary = {
  chama: {
    id: string;
    name: string;
    mpesaAccountRef: string;
    paybillNumber: string;
  };
  pool: {
    balance: number;
    totalContributed: number;
    totalDisbursed: number;
    totalRepaid: number;
    totalFeesPaid: number;
  };
  currentCycle: {
    collected: number;
    expected: number;
    collectionRate: number;
  };
  recentTransactions: Array<{
    id: string;
    type: "CONTRIBUTION" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT" | "ROTATION_PAYOUT" | "INVESTMENT_PURCHASE";
    description: string;
    amount: number;
    memberName: string;
    mpesaRef: string | null;
    createdAt: string;
  }>;
  outstandingLoans: {
    count: number;
    totalOutstanding: number;
  };
  platformFees: {
    totalThisMonth: number;
    totalAllTime: number;
    rateApplied: string;
  };
};

export type ProposalStatus =
  | "PENDING"
  | "APPROVED"
  | "EXECUTING"
  | "EXECUTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "FAILED";

export type ProposalType =
  | "LOAN_DISBURSEMENT"
  | "ROTATION_PAYOUT"
  | "INVESTMENT_PURCHASE"
  | "MANUAL_TRANSFER";

export type TxProposal = {
  id: string;
  chamaId: string;
  proposedBy: string;
  type: ProposalType;
  status: ProposalStatus;
  referenceId: string;
  referenceType: string;
  amount: number;
  recipientPhone: string;
  recipientName: string;
  description: string;
  requiredApprovals: number;
  totalSignatories: number;
  executedAt?: string | null;
  expiredAt?: string | null;
  mpesaRef?: string | null;
  failureReason?: string | null;
  createdAt: string;
  expiresAt: string;
  approvals?: Array<{
    id: string;
    signatoryId: string;
    action: "APPROVED" | "REJECTED";
    reason?: string | null;
    signedAt: string;
    signatory?: User;
  }>;
  proposer?: User;
};

export type ChamaSignatory = {
  id: string;
  chamaId: string;
  userId: string;
  addedBy: string;
  isActive: boolean;
  addedAt: string;
  removedAt?: string | null;
  user?: User;
};

export type TreasurySettings = {
  treasuryEnabled: boolean;
  requiredApprovals: number;
  proposalThresholdCents: number;
};

export type TxAnomaly = {
  proposalId: string;
  type: string;
  description: string;
  severity: string;
};

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken ?? (await SecureStore.getItemAsync("accessToken"));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status !== 401 || !original || original._retry) {
      throw error;
    }
    original._retry = true;
    const refreshToken =
      useAuthStore.getState().refreshToken ?? (await SecureStore.getItemAsync("refreshToken"));
    if (!refreshToken) throw error;
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_URL}/auth/refresh`,
      { refreshToken }
    );
    await useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    original.headers.Authorization = `Bearer ${data.accessToken}`;
    return api(original);
  }
);

export const endpoints = {
  requestOtp: async (input: RequestOtpInput | string) => {
    const payload = typeof input === "string" ? { phone: input } : input;
    await api.post("/auth/request-otp", payload);
  },
  devLogin: async (input: DevLoginInput) => {
    const { data } = await api.post<AuthResponse>("/auth/dev-login", input);
    return data;
  },
  verifyOtp: async (input: VerifyOtpInput | string, code?: string) => {
    const payload = typeof input === "string" ? { phone: input, code: code ?? "" } : input;
    const { data } = await api.post<AuthResponse>("/auth/verify-otp", payload);
    return data;
  },
  setupProfile: async (input: SetupProfileInput) =>
    (await api.post<User>("/auth/setup-profile", setupProfileSchema.parse(input))).data,
  setPin: async (pin: string, confirmPin: string) => {
    await api.post<{ success: true }>("/auth/set-pin", setPinSchema.parse({ pin, confirmPin } satisfies SetPinInput));
  },
  verifyPin: async (input: VerifyPinInput) =>
    (await api.post<AuthResponse>("/auth/verify-pin", verifyPinSchema.parse(input))).data,
  resetPin: async (pin: string, confirmPin: string) => {
    await api.post<{ success: true }>("/auth/reset-pin", resetPinSchema.parse({ pin, confirmPin } satisfies ResetPinInput));
  },
  getAuthStatus: async () => (await api.get<AuthStatusResponse>("/auth/status")).data,
  getPhoneStatus: async (phone: string) =>
    (await api.get<PhoneStatusResponse>("/auth/phone-status", { params: { phone } })).data,
  getBiometricChallenge: async (phone: string) =>
    (await api.get<{ biometricToken: string }>("/auth/biometric-challenge", { params: { phone } })).data,
  verifyBiometric: async (phone: string, biometricToken: string) =>
    (await api.post<AuthResponse>("/auth/biometric-verify", { phone, biometricToken })).data,
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  getMe: async () => (await api.get<User>("/me")).data,
  updatePushToken: async (pushToken: string) =>
    (await api.post<User>("/me/push-token", { pushToken })).data,
  getMyChamas: async () => (await api.get<MyChama[]>("/me/chamas")).data,
  getHomeSummary: async () => (await api.get<HomeSummary>("/me/home-summary")).data,
  createChama: async (input: CreateChamaRequest): Promise<ChamaResponse> =>
    (await api.post<ChamaResponse>("/chamas", createChamaSchema.parse(input))).data,
  inviteMember: async (chamaId: string, phone: InviteMemberRequest["phone"]): Promise<void> => {
    await api.post(`/chamas/${chamaId}/members`, inviteMemberSchema.parse({ phone }));
  },
  updateChama: async (chamaId: string, input: UpdateChamaInput) =>
    (await api.patch<Chama>(`/chamas/${chamaId}`, updateChamaSchema.parse(input))).data,
  updateChamaSettings: async (chamaId: string, input: UpdateChamaSettingsInput) =>
    (
      await api.patch<NonNullable<Chama["settings"]>>(
        `/chamas/${chamaId}/settings`,
        updateChamaSettingsSchema.parse(input)
      )
    ).data,
  updateGovernanceSettings: async (chamaId: string, input: GovernanceSettingsInput) =>
    (
      await api.patch<NonNullable<Chama["settings"]>>(
        `/chamas/${chamaId}/settings/governance`,
        governanceSettingsSchema.parse(input)
      )
    ).data,
  getChama: async (id: string) => (await api.get<Chama>(`/chamas/${id}`)).data,
  getFundsSummary: async (chamaId: string) =>
    (await api.get<FundsSummary>(`/chamas/${chamaId}/funds/summary`)).data,
  getContributions: async (chamaId: string) =>
    (await api.get<Contribution[]>(`/chamas/${chamaId}/contributions`)).data,
  getLoans: async (chamaId: string) => (await api.get<Loan[]>(`/chamas/${chamaId}/loans`)).data,
  getPortfolio: async (chamaId: string) =>
    (await api.get<{ investments: Investment[] }>(`/chamas/${chamaId}/investments/portfolio`)).data,
  initiateContribution: async (chamaId: string, input: InitiateContributionInput) =>
    (await api.post<Contribution>(`/chamas/${chamaId}/contributions/initiate`, input)).data,
  getFeePreview: async (amount: number, type: "CONTRIBUTION" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT" | "ROTATION_PAYOUT") =>
    (await api.get<FeePreview>("/fees/preview", { params: { amount, type } })).data,
  applyLoan: async (chamaId: string, input: ApplyLoanInput) =>
    (await api.post<Loan>(`/chamas/${chamaId}/loans`, input)).data,
  getRotations: async (chamaId: string) =>
    (await api.get<Rotation[]>(`/chamas/${chamaId}/rotations`)).data,
  getProposals: async (chamaId: string, filters?: { status?: ProposalStatus; type?: ProposalType }) =>
    (await api.get<TxProposal[]>(`/chamas/${chamaId}/treasury/proposals`, { params: filters })).data,
  getProposal: async (chamaId: string, proposalId: string) =>
    (await api.get<TxProposal>(`/chamas/${chamaId}/treasury/proposals/${proposalId}`)).data,
  approveProposal: async (chamaId: string, proposalId: string, pin: string, deviceMeta?: Record<string, unknown>) =>
    (await api.post<TxProposal>(`/chamas/${chamaId}/treasury/proposals/${proposalId}/approve`, { pin, deviceMeta })).data,
  rejectProposal: async (chamaId: string, proposalId: string, pin: string, reason: string) =>
    (await api.post<TxProposal>(`/chamas/${chamaId}/treasury/proposals/${proposalId}/reject`, { pin, reason })).data,
  cancelProposal: async (chamaId: string, proposalId: string) => {
    await api.post(`/chamas/${chamaId}/treasury/proposals/${proposalId}/cancel`);
  },
  getSignatories: async (chamaId: string) =>
    (await api.get<ChamaSignatory[]>(`/chamas/${chamaId}/treasury/signatories`)).data,
  addSignatory: async (chamaId: string, userId: string) =>
    (await api.post<ChamaSignatory>(`/chamas/${chamaId}/treasury/signatories`, { userId })).data,
  removeSignatory: async (chamaId: string, signatoryId: string) => {
    await api.delete(`/chamas/${chamaId}/treasury/signatories/${signatoryId}`);
  },
  getTreasurySettings: async (chamaId: string) =>
    (await api.get<TreasurySettings>(`/chamas/${chamaId}/treasury/settings`)).data,
  updateTreasurySettings: async (chamaId: string, data: Partial<TreasurySettings>) =>
    (await api.patch<TreasurySettings>(`/chamas/${chamaId}/treasury/settings`, data)).data,
  getAnomalies: async (chamaId: string) =>
    (await api.get<TxAnomaly[]>(`/chamas/${chamaId}/treasury/anomalies`)).data
};

export function cents(amount: number): string {
  return `KES ${(amount / 100).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function apiUrl(): string {
  return API_URL;
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string; error?: string }>(error)) {
    return (
      error.response?.data?.message ??
      error.response?.data?.error ??
      `Request failed with status ${error.response?.status ?? "unknown"}`
    );
  }

  return error instanceof Error ? error.message : "Something went wrong";
}
