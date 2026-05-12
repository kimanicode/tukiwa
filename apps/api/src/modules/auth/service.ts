import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { JWT } from "@fastify/jwt";
import type { PrismaClient, User } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma";
import { redis as defaultRedis } from "../../lib/redis";
import {
  encryptNationalId,
  hashNationalIdForIndex
} from "../../lib/crypto/national-id";
import { serialiseUser, type SafeUser } from "../../lib/serialisers/user.serialiser";
import { sendSms as defaultSendSms } from "../../lib/sms";
import { hashPin, validatePinFormat, verifyPin } from "./pin.service";

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const OTP_SALT_ROUNDS = 10;

export type AuthUser = {
  id: string;
  phone: string;
  tokenId?: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AuthenticatedUser = {
  id: string;
  phone: string;
  fullName: string;
  nationalId: string | null;
  kycVerified: boolean;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  hasPinSet: boolean;
  createdAt?: Date;
};

type OtpRecord = {
  id: string;
  code: string;
  expiresAt: Date;
  used: boolean;
};

type PrismaLike = Pick<PrismaClient, "otp" | "user" | "auditLog" | "$transaction">;

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr?(key: string): Promise<number>;
  expire?(key: string, ttl: number): Promise<unknown>;
  sadd?(key: string, value: string): Promise<unknown>;
  smembers?(key: string): Promise<string[]>;
};

export type AuthServiceDeps = {
  prisma?: PrismaLike;
  redis?: RedisLike;
  sendSms?: (phone: string, message: string) => Promise<void>;
  now?: () => Date;
  generateOtp?: () => string;
  logger?: Pick<FastifyBaseLogger, "error">;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export class AuthService {
  private readonly prisma: PrismaLike;
  private readonly redis: RedisLike;
  private readonly sms: (phone: string, message: string) => Promise<void>;
  private readonly now: () => Date;
  private readonly generateOtp: () => string;
  private readonly logger?: Pick<FastifyBaseLogger, "error">;

  constructor(private readonly jwt: JWT, deps: AuthServiceDeps = {}) {
    this.prisma = deps.prisma ?? defaultPrisma;
    this.redis = deps.redis ?? defaultRedis;
    this.sms = deps.sendSms ?? defaultSendSms;
    this.now = deps.now ?? (() => new Date());
    this.generateOtp =
      deps.generateOtp ??
      (() => Math.floor(100000 + Math.random() * 900000).toString());
    this.logger = deps.logger;
  }

  async requestOtp(phoneInput: string): Promise<{ message: "OTP sent" }> {
    const phone = normalizeKenyanPhone(phoneInput);
    const otp = this.generateOtp();
    const hashedOtp = await bcrypt.hash(otp, OTP_SALT_ROUNDS);
    const expiresAt = new Date(this.now().getTime() + OTP_EXPIRY_MS);

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, fullName: phone, isPhoneVerified: false }
    });

    await this.prisma.otp.create({
      data: {
        userId: user.id,
        code: hashedOtp,
        expiresAt
      }
    });

    await this.sms(phone, `Your Tukiwa verification code is ${otp}. It expires in 5 minutes.`);
    return { message: "OTP sent" };
  }

  async verifyOtp(
    phoneInput: string,
    code: string
  ): Promise<TokenPair & { user: AuthenticatedUser }> {
    const phone = normalizeKenyanPhone(phoneInput);
    const allowDevOtpBypass = process.env.NODE_ENV !== "production" && /^\d{6}$/.test(code);
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user && !allowDevOtpBypass) {
      throw new AuthError("Invalid or expired OTP", 401);
    }

    if (!user && allowDevOtpBypass) {
      user = await this.prisma.user.upsert({
        where: { phone },
        update: { isPhoneVerified: true },
        create: { phone, fullName: phone, isPhoneVerified: true }
      });
    }

    const otp = await this.prisma.otp.findFirst({
      where: {
        userId: user!.id,
        used: false,
        expiresAt: { gt: this.now() }
      },
      orderBy: { expiresAt: "desc" }
    });

    const otpMatches = otp ? await bcrypt.compare(code, otp.code) : false;

    if ((!otp || !otpMatches) && !allowDevOtpBypass) {
      throw new AuthError("Invalid or expired OTP", 401);
    }

    const verifiedUser = await this.prisma.$transaction(async (tx) => {
      if (otp) {
        await tx.otp.update({
          where: { id: otp.id },
          data: { used: true }
        });
      }

      return tx.user.upsert({
        where: { phone },
        update: { isPhoneVerified: true },
        create: { phone, fullName: phone, isPhoneVerified: true }
      });
    });

    const tokens = await this.issueTokenPair(verifiedUser);
    return {
      ...tokens,
      user: serializeUser(verifiedUser)
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const key = refreshTokenKey(refreshToken);
    const allowedUserId = await this.redis.get(key);

    if (!allowedUserId) {
      throw new AuthError("Invalid refresh token", 401);
    }

    let payload: AuthUser;
    try {
      payload = this.jwt.verify<AuthUser>(refreshToken);
    } catch (error) {
      this.logger?.error(error);
      await this.redis.del(key);
      throw new AuthError("Invalid refresh token", 401);
    }

    if (payload.id !== allowedUserId) {
      await this.redis.del(key);
      throw new AuthError("Invalid refresh token", 401);
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      await this.redis.del(key);
      throw new AuthError("Invalid refresh token", 401);
    }

    const tokens = await this.issueTokenPair(user);
    await this.redis.del(key);
    return tokens;
  }

  async logout(refreshToken: string): Promise<{ message: "Logged out" }> {
    await this.redis.del(refreshTokenKey(refreshToken));
    return { message: "Logged out" };
  }

  async devLogin(
    phoneInput: string,
    fullName: string
  ): Promise<TokenPair & { user: AuthenticatedUser }> {
    const phone = normalizeKenyanPhone(phoneInput);
    const user = await this.prisma.user.upsert({
      where: { phone },
      update: { fullName, isPhoneVerified: true, isProfileComplete: true },
      create: { phone, fullName, isPhoneVerified: true, isProfileComplete: true }
    });
    const tokens = await this.issueTokenPair(user);

    return {
      ...tokens,
      user: serializeUser(user)
    };
  }

  async setupProfile(
    userId: string,
    input: { fullName: string; nationalId: string }
  ): Promise<AuthenticatedUser> {
    const nationalIdHash = hashNationalIdForIndex(input.nationalId);
    const existing = await this.prisma.user.findUnique({
      where: { nationalIdHash }
    });
    if (existing && existing.id !== userId) {
      throw new AuthError("This national ID is already registered.", 409);
    }

    const encryptedId = encryptNationalId(input.nationalId);
    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: input.fullName.trim(),
          nationalId: encryptedId,
          nationalIdHash,
          isProfileComplete: true
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "PROFILE_SETUP",
          entity: "user",
          entityId: userId
        }
      });
      return updated;
    });

    return serializeUser(user);
  }

  async setPin(
    userId: string,
    input: { pin: string; confirmPin: string },
    action: "PIN_SET" | "PIN_RESET" = "PIN_SET"
  ): Promise<{ success: true }> {
    if (input.pin !== input.confirmPin) {
      throw new AuthError("PINs do not match", 400);
    }
    if (!validatePinFormat(input.pin)) {
      throw new AuthError("PIN must be exactly 4 digits", 400);
    }

    const pinHash = await hashPin(input.pin);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { pinHash, pinSetAt: this.now() }
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action,
          entity: "user",
          entityId: userId
        }
      });
    });

    if (action === "PIN_RESET") {
      await this.invalidateUserRefreshTokens(userId);
    }

    return { success: true };
  }

  async verifyPinLogin(
    phoneInput: string,
    pin: string
  ): Promise<TokenPair & { user: AuthenticatedUser }> {
    const phone = normalizeKenyanPhone(phoneInput);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new AuthError("Invalid phone or PIN", 401);
    }
    if (!user.pinHash) {
      throw new AuthError("PIN not set. Use OTP to continue.", 403);
    }

    await this.assertPinNotLocked(user.id);
    const valid = await verifyPin(pin, user.pinHash);
    if (!valid) {
      const attempts = await this.recordPinFailure(user.id);
      if (attempts >= 5) {
        await this.lockPinLogin(user.id);
        throw new AuthError("Too many attempts. Try again in 15 minutes.", 429);
      }
      throw new AuthError(`Incorrect PIN (${5 - attempts} attempts left)`, 401);
    }

    await this.resetPinFailures(user.id);
    const tokens = await this.issueTokenPair(user);
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "PIN_LOGIN",
        entity: "user",
        entityId: user.id
      }
    });

    return { ...tokens, user: serializeUser(user) };
  }

  async getAuthStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AuthError("Unauthorized", 401);
    }

    return {
      isPhoneVerified: user.isPhoneVerified,
      isProfileComplete: user.isProfileComplete,
      hasPinSet: Boolean(user.pinHash),
      user: serializeUser(user)
    };
  }

  async getPhoneStatus(phoneInput: string) {
    const phone = normalizeKenyanPhone(phoneInput);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return {
      isNewUser: !user,
      hasPinSet: Boolean(user?.pinHash),
      isPhoneVerified: Boolean(user?.isPhoneVerified),
      fullName: user?.fullName ?? null
    };
  }

  async createBiometricChallenge(phoneInput: string) {
    const phone = normalizeKenyanPhone(phoneInput);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.pinHash) {
      throw new AuthError("PIN not set", 403);
    }
    const biometricToken = randomUUID();
    await this.redis.set(bioChallengeKey(user.id), biometricToken, "EX", 30);
    return { biometricToken };
  }

  async verifyBiometric(
    phoneInput: string,
    biometricToken: string
  ): Promise<TokenPair & { user: AuthenticatedUser }> {
    const phone = normalizeKenyanPhone(phoneInput);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.pinHash) {
      throw new AuthError("Unauthorized", 401);
    }

    const key = bioChallengeKey(user.id);
    const expected = await this.redis.get(key);
    if (!expected || expected !== biometricToken) {
      throw new AuthError("Invalid biometric challenge", 401);
    }

    await this.redis.del(key);
    const tokens = await this.issueTokenPair(user);
    return { ...tokens, user: serializeUser(user) };
  }

  private async issueTokenPair(user: Pick<User, "id" | "phone">): Promise<TokenPair> {
    const basePayload: AuthUser = { id: user.id, phone: user.phone };
    const accessToken = this.jwt.sign(
      { ...basePayload, tokenId: randomUUID() },
      { expiresIn: "15m" }
    );
    const refreshToken = this.jwt.sign(
      { ...basePayload, tokenId: randomUUID() },
      { expiresIn: "30d" }
    );

    await this.redis.set(
      refreshTokenKey(refreshToken),
      user.id,
      "EX",
      REFRESH_TOKEN_TTL_SECONDS
    );
    await this.redis.sadd?.(userRefreshKey(user.id), refreshToken);
    await this.redis.expire?.(userRefreshKey(user.id), REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
  }

  private async assertPinNotLocked(userId: string): Promise<void> {
    if (await this.redis.get(pinLockedKey(userId))) {
      throw new AuthError("Too many attempts. Try again in 15 minutes.", 429);
    }
  }

  private async recordPinFailure(userId: string): Promise<number> {
    const key = pinAttemptsKey(userId);
    const attempts = this.redis.incr
      ? await this.redis.incr(key)
      : Number(await this.redis.get(key) ?? "0") + 1;
    await this.redis.set(key, String(attempts), "EX", 15 * 60);
    return attempts;
  }

  private async lockPinLogin(userId: string): Promise<void> {
    await this.redis.set(pinLockedKey(userId), "1", "EX", 15 * 60);
  }

  private async resetPinFailures(userId: string): Promise<void> {
    await this.redis.del(pinAttemptsKey(userId));
    await this.redis.del(pinLockedKey(userId));
  }

  private async invalidateUserRefreshTokens(userId: string): Promise<void> {
    const key = userRefreshKey(userId);
    const tokens = (await this.redis.smembers?.(key)) ?? [];
    for (const token of tokens) {
      await this.redis.del(refreshTokenKey(token));
    }
    await this.redis.del(key);
  }
}

export function normalizeKenyanPhone(phoneInput: string): string {
  const digits = phoneInput.replace(/\D/g, "");

  if (/^254[71]\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^0[71]\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^[71]\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  throw new AuthError("Invalid Kenyan phone number", 400);
}

function refreshTokenKey(refreshToken: string): string {
  return `auth:refresh:${refreshToken}`;
}

function userRefreshKey(userId: string): string {
  return `auth:user-refresh:${userId}`;
}

function pinAttemptsKey(userId: string): string {
  return `pin_attempts:${userId}`;
}

function pinLockedKey(userId: string): string {
  return `pin_locked:${userId}`;
}

function bioChallengeKey(userId: string): string {
  return `bio_challenge:${userId}`;
}

function serializeUser(user: User): AuthenticatedUser {
  return serialiseUser(user) as SafeUser;
}
