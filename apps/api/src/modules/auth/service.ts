import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { JWT } from "@fastify/jwt";
import type { PrismaClient, User } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma";
import { redis as defaultRedis } from "../../lib/redis";
import { sendSms as defaultSendSms } from "../../lib/sms";

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
};

type OtpRecord = {
  id: string;
  code: string;
  expiresAt: Date;
  used: boolean;
};

type PrismaLike = Pick<PrismaClient, "otp" | "user" | "$transaction">;

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
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
      create: { phone, fullName: phone }
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
    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      throw new AuthError("Invalid or expired OTP", 401);
    }

    const otp = await this.prisma.otp.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: this.now() }
      },
      orderBy: { expiresAt: "desc" }
    });

    if (!otp || !(await bcrypt.compare(code, otp.code))) {
      throw new AuthError("Invalid or expired OTP", 401);
    }

    const verifiedUser = await this.prisma.$transaction(async (tx) => {
      await tx.otp.update({
        where: { id: otp.id },
        data: { used: true }
      });

      return tx.user.upsert({
        where: { phone },
        update: {},
        create: { phone, fullName: phone }
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
      update: { fullName },
      create: { phone, fullName }
    });
    const tokens = await this.issueTokenPair(user);

    return {
      ...tokens,
      user: serializeUser(user)
    };
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

    return { accessToken, refreshToken };
  }
}

export function normalizeKenyanPhone(phoneInput: string): string {
  const digits = phoneInput.replace(/\D/g, "");

  if (/^2547\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^07\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^7\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  throw new AuthError("Invalid Kenyan phone number", 400);
}

function refreshTokenKey(refreshToken: string): string {
  return `auth:refresh:${refreshToken}`;
}

function serializeUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    phone: user.phone,
    fullName: user.fullName,
    nationalId: user.nationalId,
    kycVerified: user.kycVerified
  };
}
