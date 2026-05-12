import fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthError, AuthService } from "./service";

type UserRecord = {
  id: string;
  phone: string;
  fullName: string;
  nationalId: string | null;
  kycVerified: boolean;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  pinHash: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type OtpRecord = {
  id: string;
  userId: string;
  code: string;
  expiresAt: Date;
  used: boolean;
};

class FakeRedis {
  readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.values.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.values.delete(key) ? 1 : 0;
  }
}

class FakePrisma {
  users: UserRecord[] = [];
  otps: OtpRecord[] = [];

  user = {
    upsert: async ({ where, create, update }: any): Promise<UserRecord> => {
      const existing = this.users.find((user) => matchesUniqueUser(user, where));
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }

      const now = new Date();
      const user: UserRecord = {
        id: `user-${this.users.length + 1}`,
        phone: create.phone,
        fullName: create.fullName,
        nationalId: null,
        kycVerified: false,
        isPhoneVerified: create.isPhoneVerified ?? false,
        isProfileComplete: create.isProfileComplete ?? false,
        pinHash: create.pinHash ?? null,
        createdAt: now,
        updatedAt: now
      };
      this.users.push(user);
      return user;
    },
    findUnique: async ({ where }: any): Promise<UserRecord | null> => {
      return this.users.find((user) => matchesUniqueUser(user, where)) ?? null;
    }
  };

  otp = {
    create: async ({ data }: any): Promise<OtpRecord> => {
      const otp: OtpRecord = {
        id: `otp-${this.otps.length + 1}`,
        userId: data.userId,
        code: data.code,
        expiresAt: data.expiresAt,
        used: data.used ?? false
      };
      this.otps.push(otp);
      return otp;
    },
    findFirst: async ({ where }: any): Promise<OtpRecord | null> => {
      return (
        this.otps
          .filter((otp) => otp.userId === where.userId)
          .filter((otp) => otp.used === where.used)
          .filter((otp) => otp.expiresAt > where.expiresAt.gt)
          .sort((left, right) => right.expiresAt.getTime() - left.expiresAt.getTime())[0] ??
        null
      );
    },
    update: async ({ where, data }: any): Promise<OtpRecord> => {
      const otp = this.otps.find((candidate) => candidate.id === where.id);
      if (!otp) {
        throw new Error("OTP not found");
      }

      Object.assign(otp, data);
      return otp;
    }
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

function matchesUniqueUser(user: UserRecord, where: any): boolean {
  if (where.phone) {
    return user.phone === where.phone;
  }

  return user.id === where.id;
}

async function createJwt() {
  const app = fastify();
  await app.register(fastifyJwt, { secret: "test-secret" });
  await app.ready();
  return app;
}

describe("AuthService", () => {
  let prisma: FakePrisma;
  let redis: FakeRedis;
  let sentMessages: string[];
  let now: Date;
  let app: Awaited<ReturnType<typeof createJwt>>;
  let originalNodeEnv: string | undefined;

  beforeEach(async () => {
    originalNodeEnv = process.env.NODE_ENV;
    prisma = new FakePrisma();
    redis = new FakeRedis();
    sentMessages = [];
    now = new Date("2026-04-30T10:00:00.000Z");
    app = await createJwt();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("rejects expired OTPs", async () => {
    process.env.NODE_ENV = "production";
    const service = new AuthService(app.jwt, {
      prisma: prisma as any,
      redis,
      now: () => now,
      generateOtp: () => "123456",
      sendSms: async (_phone, message) => {
        sentMessages.push(message);
      }
    });

    await service.requestOtp("0712345678");
    now = new Date("2026-04-30T10:06:00.000Z");

    await expect(service.verifyOtp("0712345678", "123456")).rejects.toMatchObject({
      statusCode: 401
    } satisfies Partial<AuthError>);
  });

  it("rejects an already-used OTP", async () => {
    process.env.NODE_ENV = "production";
    const service = new AuthService(app.jwt, {
      prisma: prisma as any,
      redis,
      now: () => now,
      generateOtp: () => "123456",
      sendSms: async () => {}
    });

    await service.requestOtp("+254712345678");
    await service.verifyOtp("0712345678", "123456");

    await expect(service.verifyOtp("0712345678", "123456")).rejects.toMatchObject({
      statusCode: 401
    } satisfies Partial<AuthError>);
  });

  it("rotates refresh tokens", async () => {
    const service = new AuthService(app.jwt, {
      prisma: prisma as any,
      redis,
      now: () => now,
      generateOtp: () => "123456",
      sendSms: async () => {}
    });

    await service.requestOtp("0712345678");
    const verified = await service.verifyOtp("0712345678", "123456");
    const rotated = await service.refresh(verified.refreshToken);

    expect(rotated.refreshToken).not.toBe(verified.refreshToken);
    expect(await redis.get(`auth:refresh:${verified.refreshToken}`)).toBeNull();
    expect(await redis.get(`auth:refresh:${rotated.refreshToken}`)).toBe(verified.user.id);
  });

  it("invalidates refresh tokens on logout", async () => {
    const service = new AuthService(app.jwt, {
      prisma: prisma as any,
      redis,
      now: () => now,
      generateOtp: () => "123456",
      sendSms: async () => {}
    });

    await service.requestOtp("0712345678");
    const verified = await service.verifyOtp("0712345678", "123456");

    await service.logout(verified.refreshToken);

    expect(await redis.get(`auth:refresh:${verified.refreshToken}`)).toBeNull();
    await expect(service.refresh(verified.refreshToken)).rejects.toMatchObject({
      statusCode: 401
    } satisfies Partial<AuthError>);
  });

  it("creates a development account without OTP", async () => {
    const service = new AuthService(app.jwt, {
      prisma: prisma as any,
      redis,
      now: () => now
    });

    const response = await service.devLogin("0712345678", "Kimani Test");

    expect(response.user.phone).toBe("2547***678");
    expect(response.user.fullName).toBe("Kimani Test");
    expect(response.accessToken).toBeTruthy();
    expect(await redis.get(`auth:refresh:${response.refreshToken}`)).toBe(response.user.id);
    expect(sentMessages).toEqual([]);
  });
});
