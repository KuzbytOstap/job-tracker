import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindManyMock = vi.fn();
const userFindUniqueMock = vi.fn();
const userUpdateManyMock = vi.fn();
const globalLimitsUpsertMock = vi.fn();
const aiUserLimitUpsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => userFindManyMock(...args),
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      updateMany: (...args: unknown[]) => userUpdateManyMock(...args),
    },
    aiGlobalLimits: { upsert: (...args: unknown[]) => globalLimitsUpsertMock(...args) },
    aiUserLimit: { upsert: (...args: unknown[]) => aiUserLimitUpsertMock(...args) },
  },
}));

vi.mock("@/lib/ai/access-control", () => ({
  utcDateOnly: (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
}));

import { AiAccessStatus, Prisma, Role } from "@/app/generated/prisma/client";
import { AdminUserError, listAdminUsers, restoreAiAccess, setAiUserLimitOverrides, suspendAiAccess } from "@/lib/admin/users";

beforeEach(() => {
  userFindManyMock.mockReset();
  userFindUniqueMock.mockReset();
  userUpdateManyMock.mockReset();
  globalLimitsUpsertMock.mockReset();
  aiUserLimitUpsertMock.mockReset();
});

describe("listAdminUsers", () => {
  it("computes effective limits from global defaults, per-user overrides, and today's bonus", async () => {
    globalLimitsUpsertMock.mockResolvedValue({ id: 1, vacancyGenerationLimit: 10, hrGenerationLimit: 10, tokenLimit: 20_000 });
    userFindManyMock.mockResolvedValue([
      {
        id: "user_1",
        name: "Ada",
        email: "ada@example.com",
        role: Role.USER,
        aiAccessStatus: AiAccessStatus.APPROVED,
        aiUserLimit: { vacancyGenerationLimit: 15, hrGenerationLimit: null, tokenLimit: null },
        aiUsageDaily: [
          {
            vacancyGenerationCount: 4,
            hrGenerationCount: 2,
            tokenCount: 500,
            vacancyGenerationBonus: 2,
            hrGenerationBonus: 0,
            tokenBonus: 100,
          },
        ],
      },
      {
        id: "user_2",
        name: "Grace",
        email: "grace@example.com",
        role: Role.ADMIN,
        aiAccessStatus: AiAccessStatus.NOT_REQUESTED,
        aiUserLimit: null,
        aiUsageDaily: [],
      },
    ]);

    const result = await listAdminUsers();

    expect(result[0]).toEqual({
      id: "user_1",
      name: "Ada",
      email: "ada@example.com",
      role: Role.USER,
      aiAccessStatus: AiAccessStatus.APPROVED,
      usage: { vacancy: 4, hr: 2, tokens: 500 },
      limits: { vacancy: 17, hr: 10, tokens: 20_100 },
      overrides: { vacancy: 15, hr: null, tokens: null },
    });
    expect(result[1]).toEqual({
      id: "user_2",
      name: "Grace",
      email: "grace@example.com",
      role: Role.ADMIN,
      aiAccessStatus: AiAccessStatus.NOT_REQUESTED,
      usage: { vacancy: 0, hr: 0, tokens: 0 },
      limits: { vacancy: 10, hr: 10, tokens: 20_000 },
      overrides: { vacancy: null, hr: null, tokens: null },
    });
  });
});

describe("suspendAiAccess", () => {
  it("suspends an APPROVED user", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });

    await expect(suspendAiAccess("user_1")).resolves.toBe(AiAccessStatus.SUSPENDED);
    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "user_1", aiAccessStatus: AiAccessStatus.APPROVED },
      data: { aiAccessStatus: AiAccessStatus.SUSPENDED },
    });
  });

  it("throws INVALID_TRANSITION for a user who isn't APPROVED", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 0 });
    userFindUniqueMock.mockResolvedValue({ id: "user_1" });

    await expect(suspendAiAccess("user_1")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("throws NOT_FOUND when the user doesn't exist", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 0 });
    userFindUniqueMock.mockResolvedValue(null);

    await expect(suspendAiAccess("missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("restoreAiAccess", () => {
  it("restores a SUSPENDED user back to APPROVED", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });

    await expect(restoreAiAccess("user_1")).resolves.toBe(AiAccessStatus.APPROVED);
    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "user_1", aiAccessStatus: AiAccessStatus.SUSPENDED },
      data: { aiAccessStatus: AiAccessStatus.APPROVED },
    });
  });

  it("throws INVALID_TRANSITION for a user who isn't SUSPENDED", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 0 });
    userFindUniqueMock.mockResolvedValue({ id: "user_1" });

    await expect(restoreAiAccess("user_1")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
});

describe("setAiUserLimitOverrides", () => {
  it("creates an override row with only the fields provided", async () => {
    aiUserLimitUpsertMock.mockResolvedValue({ vacancyGenerationLimit: 20, hrGenerationLimit: null, tokenLimit: null });

    const result = await setAiUserLimitOverrides("user_1", { vacancyGenerationLimit: 20 });

    expect(aiUserLimitUpsertMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: { userId: "user_1", vacancyGenerationLimit: 20, hrGenerationLimit: null, tokenLimit: null },
      update: { vacancyGenerationLimit: 20 },
    });
    expect(result).toEqual({ vacancy: 20, hr: null, tokens: null });
  });

  it("clears an override when the field is explicitly null, leaving unspecified fields untouched", async () => {
    aiUserLimitUpsertMock.mockResolvedValue({ vacancyGenerationLimit: null, hrGenerationLimit: 10, tokenLimit: null });

    await setAiUserLimitOverrides("user_1", { vacancyGenerationLimit: null });

    expect(aiUserLimitUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ update: { vacancyGenerationLimit: null } }),
    );
  });

  it("maps a foreign-key violation (no such user) to NOT_FOUND", async () => {
    aiUserLimitUpsertMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed", {
        code: "P2003",
        clientVersion: "test",
      }),
    );

    await expect(setAiUserLimitOverrides("missing", { tokenLimit: 5000 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rethrows unrelated errors", async () => {
    const unrelated = new Error("db down");
    aiUserLimitUpsertMock.mockRejectedValue(unrelated);

    await expect(setAiUserLimitOverrides("user_1", { tokenLimit: 5000 })).rejects.toBe(unrelated);
  });
});

describe("AdminUserError", () => {
  it("is an instance of Error carrying its code", () => {
    const error = new AdminUserError("NOT_FOUND", "nope");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("NOT_FOUND");
  });
});
