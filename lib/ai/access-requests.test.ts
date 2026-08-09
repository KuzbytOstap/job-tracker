import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const userUpdateManyMock = vi.fn();
const aiAccessRequestCreateMock = vi.fn();
const aiAccessRequestFindManyMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      updateMany: (...args: unknown[]) => userUpdateManyMock(...args),
    },
    aiAccessRequest: {
      create: (...args: unknown[]) => aiAccessRequestCreateMock(...args),
      findMany: (...args: unknown[]) => aiAccessRequestFindManyMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

const getAiUsageStatusMock = vi.fn();
vi.mock("@/lib/ai/access-control", () => ({
  getAiUsageStatus: (...args: unknown[]) => getAiUsageStatusMock(...args),
  utcDateOnly: (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
}));

import { AiAccessStatus, AiRequestStatus, AiRequestType, Prisma } from "@/app/generated/prisma/client";
import {
  AiAccessRequestError,
  aiAccessRequestErrorStatus,
  getAiAccessStatus,
  getPendingUsageRequestTypes,
  requestAiAccess,
  requestMoreAiUsage,
} from "@/lib/ai/access-requests";

function usageStatus(overrides: Record<string, { used: number; limit: number; exhausted: boolean }> = {}) {
  return {
    resetAt: "2026-08-10T00:00:00.000Z",
    vacancy: { used: 0, limit: 10, exhausted: false },
    hr: { used: 0, limit: 10, exhausted: false },
    tokens: { used: 0, limit: 20_000, exhausted: false },
    ...overrides,
  };
}

beforeEach(() => {
  userFindUniqueMock.mockReset();
  userUpdateManyMock.mockReset();
  aiAccessRequestCreateMock.mockReset();
  aiAccessRequestFindManyMock.mockReset();
  getAiUsageStatusMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      user: { updateMany: (...args: unknown[]) => userUpdateManyMock(...args) },
      aiAccessRequest: { create: (...args: unknown[]) => aiAccessRequestCreateMock(...args) },
    }),
  );
});

describe("getAiAccessStatus", () => {
  it("returns the stored status for an existing user", async () => {
    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.APPROVED });
    await expect(getAiAccessStatus("user_1")).resolves.toBe(AiAccessStatus.APPROVED);
  });

  it("defaults to NOT_REQUESTED when the user row is missing", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    await expect(getAiAccessStatus("user_1")).resolves.toBe(AiAccessStatus.NOT_REQUESTED);
  });
});

describe("requestAiAccess", () => {
  it("transitions NOT_REQUESTED to PENDING and creates the AI_ACCESS request", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });
    aiAccessRequestCreateMock.mockResolvedValue({});

    await expect(requestAiAccess("user_1")).resolves.toBe(AiAccessStatus.PENDING);

    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "user_1", aiAccessStatus: AiAccessStatus.NOT_REQUESTED },
      data: { aiAccessStatus: AiAccessStatus.PENDING },
    });
    expect(aiAccessRequestCreateMock).toHaveBeenCalledWith({
      data: { userId: "user_1", type: AiRequestType.AI_ACCESS, status: AiRequestStatus.PENDING },
    });
  });

  it("throws NOT_ELIGIBLE and never creates a request when the user isn't NOT_REQUESTED", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(requestAiAccess("user_1")).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
    });
    expect(aiAccessRequestCreateMock).not.toHaveBeenCalled();
  });

  it("maps a unique-constraint violation on the request row to NOT_ELIGIBLE", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });
    aiAccessRequestCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(requestAiAccess("user_1")).rejects.toBeInstanceOf(AiAccessRequestError);
    await expect(requestAiAccess("user_1")).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
  });

  it("rethrows unrelated errors", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 1 });
    const unrelated = new Error("db connection reset");
    aiAccessRequestCreateMock.mockRejectedValue(unrelated);

    await expect(requestAiAccess("user_1")).rejects.toBe(unrelated);
  });
});

describe("aiAccessRequestErrorStatus", () => {
  it("maps NOT_ELIGIBLE to 409", () => {
    expect(aiAccessRequestErrorStatus("NOT_ELIGIBLE")).toBe(409);
  });

  it("maps QUOTA_NOT_EXHAUSTED to 409", () => {
    expect(aiAccessRequestErrorStatus("QUOTA_NOT_EXHAUSTED")).toBe(409);
  });
});

describe("requestMoreAiUsage", () => {
  it("creates a VACANCY_LIMIT request tagged with today's UTC quota day when the vacancy quota is exhausted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T14:32:00.000Z"));

    try {
      getAiUsageStatusMock.mockResolvedValue(usageStatus({ vacancy: { used: 10, limit: 10, exhausted: true } }));
      aiAccessRequestCreateMock.mockResolvedValue({});

      await expect(requestMoreAiUsage("user_1", AiRequestType.VACANCY_LIMIT)).resolves.toBe(AiRequestStatus.PENDING);

      expect(aiAccessRequestCreateMock).toHaveBeenCalledWith({
        data: {
          userId: "user_1",
          type: AiRequestType.VACANCY_LIMIT,
          status: AiRequestStatus.PENDING,
          quotaDate: new Date("2026-08-09T00:00:00.000Z"),
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("tags the request with the new UTC quota day once the day rolls over", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T00:00:05.000Z"));

    try {
      getAiUsageStatusMock.mockResolvedValue(usageStatus({ vacancy: { used: 10, limit: 10, exhausted: true } }));
      aiAccessRequestCreateMock.mockResolvedValue({});

      await requestMoreAiUsage("user_1", AiRequestType.VACANCY_LIMIT);

      expect(aiAccessRequestCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quotaDate: new Date("2026-08-10T00:00:00.000Z") }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("creates an HR_LIMIT request when the HR quota is exhausted", async () => {
    getAiUsageStatusMock.mockResolvedValue(usageStatus({ hr: { used: 10, limit: 10, exhausted: true } }));
    aiAccessRequestCreateMock.mockResolvedValue({});

    await requestMoreAiUsage("user_1", AiRequestType.HR_LIMIT);

    expect(aiAccessRequestCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: AiRequestType.HR_LIMIT }) }),
    );
  });

  it("creates a TOKEN_LIMIT request when the token quota is exhausted", async () => {
    getAiUsageStatusMock.mockResolvedValue(usageStatus({ tokens: { used: 20_000, limit: 20_000, exhausted: true } }));
    aiAccessRequestCreateMock.mockResolvedValue({});

    await requestMoreAiUsage("user_1", AiRequestType.TOKEN_LIMIT);

    expect(aiAccessRequestCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: AiRequestType.TOKEN_LIMIT }) }),
    );
  });

  it("throws QUOTA_NOT_EXHAUSTED and never creates a request when the quota isn't exhausted yet", async () => {
    getAiUsageStatusMock.mockResolvedValue(usageStatus());

    await expect(requestMoreAiUsage("user_1", AiRequestType.VACANCY_LIMIT)).rejects.toMatchObject({
      code: "QUOTA_NOT_EXHAUSTED",
    });
    expect(aiAccessRequestCreateMock).not.toHaveBeenCalled();
  });

  it("propagates AiAccessError from getAiUsageStatus for a non-approved user", async () => {
    const accessError = new Error("not approved");
    getAiUsageStatusMock.mockRejectedValue(accessError);

    await expect(requestMoreAiUsage("user_1", AiRequestType.VACANCY_LIMIT)).rejects.toBe(accessError);
    expect(aiAccessRequestCreateMock).not.toHaveBeenCalled();
  });

  it("maps a unique-constraint violation to NOT_ELIGIBLE (duplicate pending request)", async () => {
    getAiUsageStatusMock.mockResolvedValue(usageStatus({ vacancy: { used: 10, limit: 10, exhausted: true } }));
    aiAccessRequestCreateMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(requestMoreAiUsage("user_1", AiRequestType.VACANCY_LIMIT)).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
    });
  });

  it("rethrows unrelated errors", async () => {
    getAiUsageStatusMock.mockResolvedValue(usageStatus({ vacancy: { used: 10, limit: 10, exhausted: true } }));
    const unrelated = new Error("db connection reset");
    aiAccessRequestCreateMock.mockRejectedValue(unrelated);

    await expect(requestMoreAiUsage("user_1", AiRequestType.VACANCY_LIMIT)).rejects.toBe(unrelated);
  });
});

describe("getPendingUsageRequestTypes", () => {
  it("returns the usage-quota request types pending for today's UTC quota day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T14:32:00.000Z"));

    try {
      aiAccessRequestFindManyMock.mockResolvedValue([{ type: AiRequestType.HR_LIMIT }]);

      await expect(getPendingUsageRequestTypes("user_1")).resolves.toEqual([AiRequestType.HR_LIMIT]);
      expect(aiAccessRequestFindManyMock).toHaveBeenCalledWith({
        where: {
          userId: "user_1",
          status: AiRequestStatus.PENDING,
          type: { in: [AiRequestType.VACANCY_LIMIT, AiRequestType.HR_LIMIT, AiRequestType.TOKEN_LIMIT] },
          quotaDate: new Date("2026-08-09T00:00:00.000Z"),
        },
        select: { type: true },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("queries the new UTC quota day once the day rolls over, so a stale pending request no longer counts", async () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-08-09T23:59:59.000Z"));
      aiAccessRequestFindManyMock.mockResolvedValue([{ type: AiRequestType.VACANCY_LIMIT }]);
      await getPendingUsageRequestTypes("user_1");
      expect(aiAccessRequestFindManyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ quotaDate: new Date("2026-08-09T00:00:00.000Z") }) }),
      );

      vi.setSystemTime(new Date("2026-08-10T00:00:01.000Z"));
      aiAccessRequestFindManyMock.mockResolvedValue([]);
      await expect(getPendingUsageRequestTypes("user_1")).resolves.toEqual([]);
      expect(aiAccessRequestFindManyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ quotaDate: new Date("2026-08-10T00:00:00.000Z") }) }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns an empty array when nothing is pending", async () => {
    aiAccessRequestFindManyMock.mockResolvedValue([]);
    await expect(getPendingUsageRequestTypes("user_1")).resolves.toEqual([]);
  });
});
