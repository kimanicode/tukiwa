import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import type {
  ApplyLoanInput,
  DevLoginInput,
  InitiateContributionInput,
  RequestOtpInput,
  UpdateChamaInput,
  UpdateChamaSettingsInput,
  VerifyOtpInput
} from "@chama/shared";
import {
  createChamaSchema,
  inviteMemberSchema,
  updateChamaSettingsSchema,
  updateChamaSchema
} from "@chama/shared";
import { z } from "zod";
import { useAuthStore } from "../stores/auth.store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type User = {
  id: string;
  phone: string;
  fullName: string;
  pushToken?: string | null;
  kycVerified?: boolean;
};

export type Chama = {
  id: string;
  name: string;
  type: "MERRY_GO_ROUND" | "TABLE_BANKING" | "INVESTMENT";
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
  deductionModel: "on_top" | "deducted";
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
  requestOtp: (input: RequestOtpInput) => api.post("/auth/request-otp", input),
  devLogin: async (input: DevLoginInput) => {
    const { data } = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/dev-login",
      input
    );
    return data;
  },
  verifyOtp: async (input: VerifyOtpInput) => {
    const { data } = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
      "/auth/verify-otp",
      input
    );
    return data;
  },
  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
  getMe: async () => (await api.get<User>("/me")).data,
  updatePushToken: async (pushToken: string) =>
    (await api.post<User>("/me/push-token", { pushToken })).data,
  getMyChamas: async () => (await api.get<MyChama[]>("/me/chamas")).data,
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
  getChama: async (id: string) => (await api.get<Chama>(`/chamas/${id}`)).data,
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
    (await api.get<Rotation[]>(`/chamas/${chamaId}/rotations`)).data
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
