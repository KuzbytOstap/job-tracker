import { beforeEach, describe, expect, it, vi } from "vitest";

const aiAccessRequestFindUniqueMock = vi.fn();
const aiAccessRequestFindUniqueOrThrowMock = vi.fn();
const aiAccessRequestFindManyMock = vi.fn();
const aiAccessRequestUpdateManyMock = vi.fn();
const userUpdateMock = vi.fn();
const aiUsageDailyUpsertMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiAccessRequest: {
      findUnique: (...args: unknown[]) => aiAccessRequestFindUniqueMock(...args),
      findUniqueOrThrow: (...args: unknown[]) => aiAccessRequestFindUniqueOrThrowMock(...args),
      findMany: (...args: unknown[]) => aiAccessRequestFindManyMock(...args),
      updateMany: (...args: unknown[]) => aiAccessRequestUpdateManyMock(...args),
    },
    user: {
      update: (...args: unknown[]) => userUpdateMock(...args),
    },
    aiUsageDaily: {
      upsert: (...args: unknown[]) => aiUsageDailyUpsertMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

vi.mock("@/lib/ai/access-control", () => ({
  utcDateOnly: (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
}));

import { AiAccessStatus, AiRequestStatus, AiRequestType } from "@/app/generated/prisma/client";
import { AdminAiRequestError, decideAiRequest, listAiRequests } from "@/lib/admin/ai-requests";

const USER_REF = { id: "user_1", name: "Ada", email: "ada@example.com" };
const ADMIN_ID = "admin_1";

function requestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "req_1",
    userId: "user_1",
    type: AiRequestType.AI_ACCESS,
    status: AiRequestStatus.PENDING,
    quotaDate: null,
    message: null,
    decidedAt: null,
    decidedByUserId: null,
    decisionNote: null,
    grantedAmount: null,
    createdAt: new Date("2026-08-09T10:00:00.000Z"),
    updatedAt: new Date("2026-08-09T10:00:00.000Z"),
    user: USER_REF,
    decidedByUser: null,
    ...overrides,
  };
}

beforeEach(() => {
  aiAccessRequestFindUniqueMock.mockReset();
  aiAccessRequestFindUniqueOrThrowMock.mockReset();
  aiAccessRequestFindManyMock.mockReset();
  aiAccessRequestUpdateManyMock.mockReset();
  userUpdateMock.mockReset();
  aiUsageDailyUpsertMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      aiAccessRequest: { updateMany: (...args: unknown[]) => aiAccessRequestUpdateManyMock(...args) },
      user: { update: (...args: unknown[]) => userUpdateMock(...args) },
      aiUsageDaily: { upsert: (...args: unknown[]) => aiUsageDailyUpsertMock(...args) },
    }),
  );
  vi.useRealTimers();
});

describe("listAiRequests", () => {
  it("passes status/type filters through and maps rows to DTOs", async () => {
    aiAccessRequestFindManyMock.mockResolvedValue([requestRow()]);

    const result = await listAiRequests({ status: AiRequestStatus.PENDING, type: AiRequestType.AI_ACCESS });

    expect(aiAccessRequestFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: AiRequestStatus.PENDING, type: AiRequestType.AI_ACCESS },
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({ id: "req_1", user: USER_REF, decidedByUser: null }),
    ]);
  });
});

describe("decideAiRequest — NOT_FOUND", () => {
  it("throws NOT_FOUND when the request doesn't exist", async () => {
    aiAccessRequestFindUniqueMock.mockResolvedValue(null);

    await expect(
      decideAiRequest({ requestId: "missing", adminUserId: ADMIN_ID, decision: "APPROVED" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("decideAiRequest — AI_ACCESS", () => {
  it("approves: flips the request to APPROVED and the user to APPROVED atomically", async () => {
    aiAccessRequestFindUniqueMock.mockResolvedValue(requestRow());
    aiAccessRequestUpdateManyMock.mockResolvedValue({ count: 1 });
    userUpdateMock.mockResolvedValue({});
    aiAccessRequestFindUniqueOrThrowMock.mockResolvedValue(
      requestRow({ status: AiRequestStatus.APPROVED, decidedAt: new Date(), decidedByUserId: ADMIN_ID }),
    );

    const result = await decideAiRequest({
      requestId: "req_1",
      adminUserId: ADMIN_ID,
      decision: "APPROVED",
      decisionNote: "looks good",
    });

    expect(aiAccessRequestUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "req_1", status: AiRequestStatus.PENDING, type: AiRequestType.AI_ACCESS },
      data: expect.objectContaining({
        status: AiRequestStatus.APPROVED,
        decidedByUserId: ADMIN_ID,
        decisionNote: "looks good",
      }),
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { aiAccessStatus: AiAccessStatus.APPROVED },
    });
    expect(result.status).toBe(AiRequestStatus.APPROVED);
  });

  it("rejects: flips the request to REJECTED and the user to REJECTED", async () => {
    aiAccessRequestFindUniqueMock.mockResolvedValue(requestRow());
    aiAccessRequestUpdateManyMock.mockResolvedValue({ count: 1 });
    userUpdateMock.mockResolvedValue({});
    aiAccessRequestFindUniqueOrThrowMock.mockResolvedValue(requestRow({ status: AiRequestStatus.REJECTED }));

    await decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "REJECTED" });

    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { aiAccessStatus: AiAccessStatus.REJECTED },
    });
  });

  it("throws ALREADY_DECIDED and never updates the user when the guarded update matches nothing", async () => {
    aiAccessRequestFindUniqueMock.mockResolvedValue(requestRow({ status: AiRequestStatus.APPROVED }));
    aiAccessRequestUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "REJECTED" }),
    ).rejects.toMatchObject({ code: "ALREADY_DECIDED" });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

describe("decideAiRequest — usage limit requests", () => {
  it("throws STALE_REQUEST and never approves a request whose quotaDate isn't today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));

    try {
      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({
          type: AiRequestType.VACANCY_LIMIT,
          quotaDate: new Date("2026-08-08T00:00:00.000Z"),
        }),
      );

      await expect(
        decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "APPROVED", grantedAmount: 5 }),
      ).rejects.toMatchObject({ code: "STALE_REQUEST" });
      expect(aiAccessRequestUpdateManyMock).not.toHaveBeenCalled();
      expect(aiUsageDailyUpsertMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows rejecting a stale request (quotaDate from a previous UTC day) and never touches AiUsageDaily", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const staleQuotaDate = new Date("2026-08-05T00:00:00.000Z");

    try {
      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({ type: AiRequestType.TOKEN_LIMIT, quotaDate: staleQuotaDate }),
      );
      aiAccessRequestUpdateManyMock.mockResolvedValue({ count: 1 });
      aiAccessRequestFindUniqueOrThrowMock.mockResolvedValue(
        requestRow({ type: AiRequestType.TOKEN_LIMIT, status: AiRequestStatus.REJECTED, quotaDate: staleQuotaDate }),
      );

      const result = await decideAiRequest({
        requestId: "req_1",
        adminUserId: ADMIN_ID,
        decision: "REJECTED",
        decisionNote: "no longer relevant",
      });

      expect(aiAccessRequestUpdateManyMock).toHaveBeenCalledWith({
        where: { id: "req_1", status: AiRequestStatus.PENDING },
        data: expect.objectContaining({ status: AiRequestStatus.REJECTED, decisionNote: "no longer relevant" }),
      });
      expect(result.status).toBe(AiRequestStatus.REJECTED);
      expect(aiUsageDailyUpsertMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws ALREADY_DECIDED for a request that is no longer PENDING, before checking staleness", async () => {
    aiAccessRequestFindUniqueMock.mockResolvedValue(
      requestRow({ type: AiRequestType.HR_LIMIT, status: AiRequestStatus.REJECTED, quotaDate: new Date() }),
    );

    await expect(
      decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "APPROVED", grantedAmount: 5 }),
    ).rejects.toMatchObject({ code: "ALREADY_DECIDED" });
    expect(aiUsageDailyUpsertMock).not.toHaveBeenCalled();
  });

  it("approves and grants the requested bonus atomically with the decision", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const today = new Date("2026-08-09T00:00:00.000Z");

    try {
      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({ type: AiRequestType.HR_LIMIT, quotaDate: today }),
      );
      aiAccessRequestUpdateManyMock.mockResolvedValue({ count: 1 });
      aiUsageDailyUpsertMock.mockResolvedValue({});
      aiAccessRequestFindUniqueOrThrowMock.mockResolvedValue(
        requestRow({ type: AiRequestType.HR_LIMIT, status: AiRequestStatus.APPROVED, quotaDate: today, grantedAmount: 5 }),
      );

      const result = await decideAiRequest({
        requestId: "req_1",
        adminUserId: ADMIN_ID,
        decision: "APPROVED",
        grantedAmount: 5,
      });

      expect(aiAccessRequestUpdateManyMock).toHaveBeenCalledWith({
        where: { id: "req_1", status: AiRequestStatus.PENDING, quotaDate: today },
        data: expect.objectContaining({ status: AiRequestStatus.APPROVED, grantedAmount: 5 }),
      });
      expect(aiUsageDailyUpsertMock).toHaveBeenCalledWith({
        where: { userId_date: { userId: "user_1", date: today } },
        create: { userId: "user_1", date: today, hrGenerationBonus: 5 },
        update: { hrGenerationBonus: { increment: 5 } },
      });
      expect(result.grantedAmount).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps VACANCY_LIMIT and TOKEN_LIMIT to their own bonus fields", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const today = new Date("2026-08-09T00:00:00.000Z");

    try {
      aiAccessRequestUpdateManyMock.mockResolvedValue({ count: 1 });
      aiUsageDailyUpsertMock.mockResolvedValue({});
      aiAccessRequestFindUniqueOrThrowMock.mockResolvedValue(requestRow());

      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({ type: AiRequestType.VACANCY_LIMIT, quotaDate: today }),
      );
      await decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "APPROVED", grantedAmount: 3 });
      expect(aiUsageDailyUpsertMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ update: { vacancyGenerationBonus: { increment: 3 } } }),
      );

      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({ type: AiRequestType.TOKEN_LIMIT, quotaDate: today }),
      );
      await decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "APPROVED", grantedAmount: 1000 });
      expect(aiUsageDailyUpsertMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ update: { tokenBonus: { increment: 1000 } } }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a same-day usage-limit request without touching AiUsageDaily", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const today = new Date("2026-08-09T00:00:00.000Z");

    try {
      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({ type: AiRequestType.VACANCY_LIMIT, quotaDate: today }),
      );
      aiAccessRequestUpdateManyMock.mockResolvedValue({ count: 1 });
      aiAccessRequestFindUniqueOrThrowMock.mockResolvedValue(
        requestRow({ type: AiRequestType.VACANCY_LIMIT, status: AiRequestStatus.REJECTED, quotaDate: today }),
      );

      const result = await decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "REJECTED" });

      expect(aiAccessRequestUpdateManyMock).toHaveBeenCalledWith({
        where: { id: "req_1", status: AiRequestStatus.PENDING },
        data: expect.objectContaining({ status: AiRequestStatus.REJECTED }),
      });
      expect(result.status).toBe(AiRequestStatus.REJECTED);
      expect(aiUsageDailyUpsertMock).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws INVALID_GRANT_AMOUNT and never writes anything when approving without a positive grantedAmount", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const today = new Date("2026-08-09T00:00:00.000Z");

    try {
      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({ type: AiRequestType.VACANCY_LIMIT, quotaDate: today }),
      );

      await expect(
        decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "APPROVED" }),
      ).rejects.toMatchObject({ code: "INVALID_GRANT_AMOUNT" });

      await expect(
        decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "APPROVED", grantedAmount: 0 }),
      ).rejects.toMatchObject({ code: "INVALID_GRANT_AMOUNT" });

      expect(transactionMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("never double-grants on concurrent approval: the losing decision sees ALREADY_DECIDED and never reaches the bonus upsert", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00.000Z"));
    const today = new Date("2026-08-09T00:00:00.000Z");

    try {
      aiAccessRequestFindUniqueMock.mockResolvedValue(
        requestRow({ type: AiRequestType.HR_LIMIT, quotaDate: today }),
      );
      aiAccessRequestUpdateManyMock.mockResolvedValueOnce({ count: 0 });

      await expect(
        decideAiRequest({ requestId: "req_1", adminUserId: ADMIN_ID, decision: "APPROVED", grantedAmount: 5 }),
      ).rejects.toMatchObject({ code: "ALREADY_DECIDED" });

      expect(aiUsageDailyUpsertMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("AdminAiRequestError", () => {
  it("is an instance of Error carrying its code", () => {
    const error = new AdminAiRequestError("STALE_REQUEST", "too old");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("STALE_REQUEST");
  });
});
