import fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import { ChamaType, Cycle, MemberRole } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import chamaRoutes from ".";

type UserRecord = {
  id: string;
  phone: string;
  fullName: string;
  nationalId: string | null;
  pushToken: string | null;
  kycVerified: boolean;
};

type ChamaRecord = {
  id: string;
  name: string;
  type: ChamaType;
  description: string | null;
  logoUrl: string | null;
};

type SettingsRecord = {
  id: string;
  chamaId: string;
  contributionAmount: number;
  contributionCycle: Cycle;
  loanInterestRate: number;
  maxLoanMultiplier: number;
  penaltyRate: number;
  requiresMeetingForLoan: boolean;
};

type MemberRecord = {
  id: string;
  chamaId: string;
  userId: string;
  role: MemberRole;
  shares: number;
  isActive: boolean;
};

class FakePrisma {
  users: UserRecord[] = [
    user("admin", "254700000001"),
    user("member", "254700000002"),
    user("existing", "254712345678")
  ];
  chamas: ChamaRecord[] = [
    {
      id: "chama-1",
      name: "Test Chama",
      type: ChamaType.TABLE_BANKING,
      description: null,
      logoUrl: null
    }
  ];
  members: MemberRecord[] = [
    member("admin-member", "chama-1", "admin", MemberRole.ADMIN),
    member("plain-member", "chama-1", "member", MemberRole.MEMBER)
  ];
  settings: SettingsRecord[] = [
    {
      id: "settings-1",
      chamaId: "chama-1",
      contributionAmount: 500000,
      contributionCycle: Cycle.MONTHLY,
      loanInterestRate: 8,
      maxLoanMultiplier: 3,
      penaltyRate: 5,
      requiresMeetingForLoan: true
    }
  ];
  auditLogs: unknown[] = [];

  chama = {
    create: async ({ data }: any): Promise<ChamaRecord> => {
      const chama: ChamaRecord = {
        id: `chama-${this.chamas.length + 1}`,
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        logoUrl: data.logoUrl ?? null
      };
      this.chamas.push(chama);
      return chama;
    },
    findUnique: async ({ where }: any): Promise<ChamaRecord | null> => {
      return this.chamas.find((chama) => chama.id === where.id) ?? null;
    },
    update: async ({ where, data }: any): Promise<ChamaRecord> => {
      const chama = this.chamas.find((candidate) => candidate.id === where.id);
      if (!chama) {
        throw new Error("Chama not found");
      }

      Object.assign(chama, data);
      return chama;
    }
  };

  chamaSettings = {
    create: async ({ data }: any): Promise<SettingsRecord> => {
      const created: SettingsRecord = {
        id: `settings-${this.settings.length + 1}`,
        chamaId: data.chamaId,
        contributionAmount: data.contributionAmount,
        contributionCycle: data.contributionCycle,
        loanInterestRate: data.loanInterestRate,
        maxLoanMultiplier: data.maxLoanMultiplier,
        penaltyRate: data.penaltyRate,
        requiresMeetingForLoan: data.requiresMeetingForLoan
      };
      this.settings.push(created);
      return created;
    },
    update: async ({ where, data }: any): Promise<SettingsRecord> => {
      const existing = this.settings.find((candidate) => candidate.chamaId === where.chamaId);
      if (!existing) {
        throw new Error("Chama settings not found");
      }

      Object.assign(existing, data);
      return existing;
    }
  };

  chamaMember = {
    create: async ({ data }: any): Promise<MemberRecord> => {
      const created = member(
        `member-${this.members.length + 1}`,
        data.chamaId,
        data.userId,
        data.role
      );
      this.members.push(created);
      return created;
    },
    findFirst: async ({ where }: any): Promise<MemberRecord | null> => {
      return (
        this.members.find((candidate) => {
          return Object.entries(where).every(([key, value]) => {
            return candidate[key as keyof MemberRecord] === value;
          });
        }) ?? null
      );
    },
    count: async ({ where }: any): Promise<number> => {
      return this.members.filter((candidate) => {
        return Object.entries(where).every(([key, value]) => {
          return candidate[key as keyof MemberRecord] === value;
        });
      }).length;
    },
    update: async ({ where, data }: any): Promise<MemberRecord> => {
      const existing = this.members.find((candidate) => candidate.id === where.id);
      if (!existing) {
        throw new Error("Member not found");
      }

      Object.assign(existing, data);
      return existing;
    },
    upsert: async ({ where, update, create }: any): Promise<MemberRecord> => {
      const existing = this.members.find((candidate) => {
        return (
          candidate.chamaId === where.chamaId_userId.chamaId &&
          candidate.userId === where.chamaId_userId.userId
        );
      });

      if (existing) {
        Object.assign(existing, update);
        return existing;
      }

      const created = member(
        `member-${this.members.length + 1}`,
        create.chamaId,
        create.userId,
        create.role
      );
      this.members.push(created);
      return created;
    }
  };

  user = {
    findUnique: async ({ where }: any): Promise<UserRecord | null> => {
      return this.users.find((candidate) => candidate.phone === where.phone || candidate.id === where.id) ?? null;
    },
    upsert: async ({ where, create, update }: any): Promise<UserRecord> => {
      const existing = this.users.find((candidate) => candidate.phone === where.phone);
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }

      const created = user(`user-${this.users.length + 1}`, create.phone);
      this.users.push(created);
      return created;
    }
  };

  auditLog = {
    create: async ({ data }: any): Promise<unknown> => {
      this.auditLogs.push(data);
      return data;
    }
  };

  contribution = {
    aggregate: async (): Promise<{ _sum: { amount: number | null } }> => ({ _sum: { amount: 0 } })
  };

  loan = {
    aggregate: async (): Promise<{ _sum: { amount: number | null } }> => ({ _sum: { amount: 0 } })
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

function user(id: string, phone: string): UserRecord {
  return {
    id,
    phone,
    fullName: phone,
    nationalId: null,
    pushToken: null,
    kycVerified: false
  };
}

function member(
  id: string,
  chamaId: string,
  userId: string,
  role: MemberRole
): MemberRecord {
  return {
    id,
    chamaId,
    userId,
    role,
    shares: 1,
    isActive: true
  };
}

async function buildApp(prisma: FakePrisma, actorId: string) {
  const app = fastify();
  const sentSms: string[] = [];
  await app.register(fastifyJwt, { secret: "test-secret" });
  await app.register(chamaRoutes, {
    prisma: prisma as any,
    sendSms: async (phone: string, message: string) => {
      sentSms.push(`${phone}:${message}`);
    }
  });
  await app.ready();

  const token = app.jwt.sign({ id: actorId, phone: "254700000001" });
  return { app, token, sentSms };
}

describe("chama routes", () => {
  let prisma: FakePrisma;

  beforeEach(() => {
    prisma = new FakePrisma();
  });

  it("rejects MEMBER chama updates", async () => {
    const { app, token } = await buildApp(prisma, "member");

    const response = await app.inject({
      method: "PATCH",
      url: "/chamas/chama-1",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Updated" }
    });

    expect(response.statusCode).toBe(403);
  });

  it("prevents demoting the last ADMIN", async () => {
    const { app, token } = await buildApp(prisma, "admin");

    const response = await app.inject({
      method: "PATCH",
      url: "/chamas/chama-1/members/admin-member/role",
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "MEMBER" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: "Cannot demote the last ADMIN" });
  });

  it("allows ADMIN settings updates", async () => {
    const { app, token } = await buildApp(prisma, "admin");

    const response = await app.inject({
      method: "PATCH",
      url: "/chamas/chama-1/settings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        contributionAmount: 750000,
        contributionCycle: "WEEKLY",
        loanInterestRate: 10,
        maxLoanMultiplier: 4,
        penaltyRate: 6,
        requiresMeetingForLoan: false
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      contributionAmount: 750000,
      contributionCycle: "WEEKLY",
      loanInterestRate: 10,
      maxLoanMultiplier: 4,
      penaltyRate: 6,
      requiresMeetingForLoan: false
    });
    expect(prisma.auditLogs).toContainEqual(
      expect.objectContaining({
        action: "CHAMA_SETTINGS_UPDATED",
        entity: "ChamaSettings",
        entityId: "settings-1"
      })
    );
  });

  it("rejects MEMBER settings updates", async () => {
    const { app, token } = await buildApp(prisma, "member");

    const response = await app.inject({
      method: "PATCH",
      url: "/chamas/chama-1/settings",
      headers: { authorization: `Bearer ${token}` },
      payload: { contributionAmount: 750000 }
    });

    expect(response.statusCode).toBe(403);
  });

  it("invites an existing user", async () => {
    const { app, token, sentSms } = await buildApp(prisma, "admin");

    const response = await app.inject({
      method: "POST",
      url: "/chamas/chama-1/members",
      headers: { authorization: `Bearer ${token}` },
      payload: { phone: "0712345678" }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().wasExistingUser).toBe(true);
    expect(prisma.users).toHaveLength(3);
    expect(prisma.members.some((candidate) => candidate.userId === "existing")).toBe(true);
    expect(sentSms[0]).toContain("254712345678");
  });

  it("invites a new user", async () => {
    const { app, token } = await buildApp(prisma, "admin");

    const response = await app.inject({
      method: "POST",
      url: "/chamas/chama-1/members",
      headers: { authorization: `Bearer ${token}` },
      payload: { phone: "0799999999" }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().wasExistingUser).toBe(false);
    expect(prisma.users.some((candidate) => candidate.phone === "254799999999")).toBe(true);
  });
});
