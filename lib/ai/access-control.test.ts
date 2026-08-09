import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const globalLimitsUpsertMock = vi.fn();
const userLimitFindUniqueMock = vi.fn();
const dailyUpsertMock = vi.fn();
const dailyUpdateManyMock = vi.fn();
const dailyFindUniqueMock = vi.fn();
const dailyUpdateMock = vi.fn();
const usageEventCreateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    aiGlobalLimits: { upsert: (...args: unknown[]) => globalLimitsUpsertMock(...args) },
    aiUserLimit: { findUnique: (...args: unknown[]) => userLimitFindUniqueMock(...args) },
    aiUsageDaily: {
      upsert: (...args: unknown[]) => dailyUpsertMock(...args),
      updateMany: (...args: unknown[]) => dailyUpdateManyMock(...args),
      findUnique: (...args: unknown[]) => dailyFindUniqueMock(...args),
      update: (...args: unknown[]) => dailyUpdateMock(...args),
    },
    aiUsageEvent: { create: (...args: unknown[]) => usageEventCreateMock(...args) },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import { AiAccessStatus, AiFeature } from "@/app/generated/prisma/client";
import {
  AiAccessError,
  finalizeAiUsage,
  getAiUsageStatus,
  requireAiAccessApproved,
  reserveAiQuota,
  rollbackAiReservation,
  runGatedAiCall,
} from "@/lib/ai/access-control";
import type { AiUsageReport } from "@/lib/ai/token-usage";

function dailyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "daily_1",
    userId: "user_1",
    date: new Date("2026-08-09T00:00:00.000Z"),
    vacancyGenerationCount: 0,
    hrGenerationCount: 0,
    tokenCount: 0,
    vacancyGenerationBonus: 0,
    hrGenerationBonus: 0,
    tokenBonus: 0,
    ...overrides,
  };
}

beforeEach(() => {
  userFindUniqueMock.mockReset();
  globalLimitsUpsertMock.mockReset();
  userLimitFindUniqueMock.mockReset();
  dailyUpsertMock.mockReset();
  dailyUpdateManyMock.mockReset();
  dailyFindUniqueMock.mockReset();
  dailyUpdateMock.mockReset();
  usageEventCreateMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation((operations: Promise<unknown>[]) => Promise.all(operations));

  userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.APPROVED });
  globalLimitsUpsertMock.mockResolvedValue({
    id: 1,
    vacancyGenerationLimit: 10,
    hrGenerationLimit: 10,
    tokenLimit: 20_000,
  });
  userLimitFindUniqueMock.mockResolvedValue(null);
  dailyUpsertMock.mockResolvedValue(dailyRow());
  dailyUpdateManyMock.mockResolvedValue({ count: 1 });
  dailyUpdateMock.mockResolvedValue(dailyRow());
  usageEventCreateMock.mockResolvedValue({});
});

describe("requireAiAccessApproved", () => {
  it("resolves without touching quota tables when the user is approved", async () => {
    await expect(requireAiAccessApproved("user_1")).resolves.toBeUndefined();
    expect(dailyUpsertMock).not.toHaveBeenCalled();
    expect(globalLimitsUpsertMock).not.toHaveBeenCalled();
  });

  it("throws AI_ACCESS_REQUIRED for NOT_REQUESTED/PENDING/REJECTED", async () => {
    for (const status of [AiAccessStatus.NOT_REQUESTED, AiAccessStatus.PENDING, AiAccessStatus.REJECTED]) {
      userFindUniqueMock.mockResolvedValue({ aiAccessStatus: status });
      await expect(requireAiAccessApproved("user_1")).rejects.toMatchObject({ code: "AI_ACCESS_REQUIRED" });
    }
  });

  it("throws AI_SUSPENDED when suspended", async () => {
    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.SUSPENDED });
    await expect(requireAiAccessApproved("user_1")).rejects.toMatchObject({ code: "AI_SUSPENDED" });
  });
});

describe("reserveAiQuota — access gating", () => {
  it("throws AI_ACCESS_REQUIRED when the user has not been approved", async () => {
    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.NOT_REQUESTED });

    await expect(
      reserveAiQuota({ userId: "user_1", feature: AiFeature.VACANCY_GENERATION, estimatedTokens: 100 }),
    ).rejects.toMatchObject({ code: "AI_ACCESS_REQUIRED" });
    expect(dailyUpdateManyMock).not.toHaveBeenCalled();
  });

  it("throws AI_SUSPENDED when AI access has been suspended", async () => {
    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.SUSPENDED });

    await expect(
      reserveAiQuota({ userId: "user_1", feature: AiFeature.HR_GENERATION, estimatedTokens: 100 }),
    ).rejects.toMatchObject({ code: "AI_SUSPENDED" });
    expect(dailyUpdateManyMock).not.toHaveBeenCalled();
  });

  it("treats a user with no row yet as not approved", async () => {
    userFindUniqueMock.mockResolvedValue(null);

    await expect(
      reserveAiQuota({ userId: "user_1", feature: AiFeature.VACANCY_GENERATION, estimatedTokens: 100 }),
    ).rejects.toMatchObject({ code: "AI_ACCESS_REQUIRED" });
  });
});

describe("reserveAiQuota — limits and reservation", () => {
  it("ensures the global limits singleton and the daily usage row both exist via upsert", async () => {
    await reserveAiQuota({ userId: "user_1", feature: AiFeature.VACANCY_GENERATION, estimatedTokens: 100 });

    expect(globalLimitsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
    expect(dailyUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_date: { userId: "user_1", date: expect.any(Date) } } }),
    );
  });

  it("reserves against the vacancy generation counter and the shared token counter atomically", async () => {
    const reservation = await reserveAiQuota({
      userId: "user_1",
      feature: AiFeature.VACANCY_GENERATION,
      estimatedTokens: 500,
    });

    expect(dailyUpdateManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        date: expect.any(Date),
        vacancyGenerationCount: { lt: 10 },
        tokenCount: { lte: 20_000 - 500 },
      },
      data: {
        vacancyGenerationCount: { increment: 1 },
        tokenCount: { increment: 500 },
      },
    });
    expect(reservation.reservedTokens).toBe(500);
    expect(reservation.feature).toBe(AiFeature.VACANCY_GENERATION);
  });

  it("reserves against the HR generation counter for HR_GENERATION", async () => {
    await reserveAiQuota({ userId: "user_1", feature: AiFeature.HR_GENERATION, estimatedTokens: 200 });

    expect(dailyUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hrGenerationCount: { lt: 10 } }),
        data: expect.objectContaining({ hrGenerationCount: { increment: 1 } }),
      }),
    );
  });

  it("applies a per-user override in place of the global default", async () => {
    userLimitFindUniqueMock.mockResolvedValue({
      vacancyGenerationLimit: 3,
      hrGenerationLimit: null,
      tokenLimit: null,
    });

    await reserveAiQuota({ userId: "user_1", feature: AiFeature.VACANCY_GENERATION, estimatedTokens: 100 });

    expect(dailyUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ vacancyGenerationCount: { lt: 3 } }) }),
    );
  });

  it("adds the current day's bonus on top of the effective limit", async () => {
    dailyUpsertMock.mockResolvedValue(dailyRow({ vacancyGenerationBonus: 5, tokenBonus: 1_000 }));

    await reserveAiQuota({ userId: "user_1", feature: AiFeature.VACANCY_GENERATION, estimatedTokens: 100 });

    expect(dailyUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          vacancyGenerationCount: { lt: 15 },
          tokenCount: { lte: 21_000 - 100 },
        }),
      }),
    );
  });

  it("throws VACANCY_LIMIT_REACHED when the feature counter is already at the limit", async () => {
    dailyUpdateManyMock.mockResolvedValue({ count: 0 });
    dailyFindUniqueMock.mockResolvedValue(dailyRow({ vacancyGenerationCount: 10 }));

    await expect(
      reserveAiQuota({ userId: "user_1", feature: AiFeature.VACANCY_GENERATION, estimatedTokens: 100 }),
    ).rejects.toMatchObject({ code: "VACANCY_LIMIT_REACHED" });
  });

  it("throws HR_LIMIT_REACHED when the feature counter is already at the limit", async () => {
    dailyUpdateManyMock.mockResolvedValue({ count: 0 });
    dailyFindUniqueMock.mockResolvedValue(dailyRow({ hrGenerationCount: 10 }));

    await expect(
      reserveAiQuota({ userId: "user_1", feature: AiFeature.HR_GENERATION, estimatedTokens: 100 }),
    ).rejects.toMatchObject({ code: "HR_LIMIT_REACHED" });
  });

  it("throws TOKEN_LIMIT_REACHED when only the shared token budget is exhausted", async () => {
    dailyUpdateManyMock.mockResolvedValue({ count: 0 });
    dailyFindUniqueMock.mockResolvedValue(dailyRow({ vacancyGenerationCount: 2, tokenCount: 19_999 }));

    await expect(
      reserveAiQuota({ userId: "user_1", feature: AiFeature.VACANCY_GENERATION, estimatedTokens: 500 }),
    ).rejects.toMatchObject({ code: "TOKEN_LIMIT_REACHED" });
  });
});

describe("getAiUsageStatus", () => {
  it("throws AI_ACCESS_REQUIRED / AI_SUSPENDED for a non-approved user without touching quota tables", async () => {
    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.PENDING });

    await expect(getAiUsageStatus("user_1")).rejects.toMatchObject({ code: "AI_ACCESS_REQUIRED" });
    expect(dailyUpsertMock).not.toHaveBeenCalled();

    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.SUSPENDED });
    await expect(getAiUsageStatus("user_1")).rejects.toMatchObject({ code: "AI_SUSPENDED" });
  });

  it("reports used/limit/exhausted for each quota against the effective limits", async () => {
    dailyUpsertMock.mockResolvedValue(
      dailyRow({ vacancyGenerationCount: 10, hrGenerationCount: 3, tokenCount: 19_999 }),
    );

    const status = await getAiUsageStatus("user_1");

    expect(status.vacancy).toEqual({ used: 10, limit: 10, exhausted: true });
    expect(status.hr).toEqual({ used: 3, limit: 10, exhausted: false });
    expect(status.tokens).toEqual({ used: 19_999, limit: 20_000, exhausted: false });
  });

  it("applies per-user overrides and today's bonuses the same way reserveAiQuota does", async () => {
    userLimitFindUniqueMock.mockResolvedValue({ vacancyGenerationLimit: 3, hrGenerationLimit: null, tokenLimit: null });
    dailyUpsertMock.mockResolvedValue(
      dailyRow({ vacancyGenerationCount: 3, hrGenerationBonus: 5, hrGenerationCount: 12 }),
    );

    const status = await getAiUsageStatus("user_1");

    expect(status.vacancy).toEqual({ used: 3, limit: 3, exhausted: true });
    expect(status.hr).toEqual({ used: 12, limit: 15, exhausted: false });
  });

  it("resolves resetAt to the next UTC midnight after today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T14:32:00.000Z"));

    try {
      const status = await getAiUsageStatus("user_1");
      expect(status.resetAt).toBe("2026-08-10T00:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("rollbackAiReservation", () => {
  it("decrements the vacancy counter and the reserved tokens back", async () => {
    await rollbackAiReservation({
      userId: "user_1",
      feature: AiFeature.VACANCY_GENERATION,
      date: new Date("2026-08-09T00:00:00.000Z"),
      reservedTokens: 500,
    });

    expect(dailyUpdateMock).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user_1", date: new Date("2026-08-09T00:00:00.000Z") } },
      data: { vacancyGenerationCount: { decrement: 1 }, tokenCount: { decrement: 500 } },
    });
  });

  it("decrements the HR counter for HR_GENERATION", async () => {
    await rollbackAiReservation({
      userId: "user_1",
      feature: AiFeature.HR_GENERATION,
      date: new Date("2026-08-09T00:00:00.000Z"),
      reservedTokens: 200,
    });

    expect(dailyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { hrGenerationCount: { decrement: 1 }, tokenCount: { decrement: 200 } } }),
    );
  });
});

describe("finalizeAiUsage", () => {
  it("reconciles the reserved estimate down to the real token count and records an event", async () => {
    await finalizeAiUsage({
      reservation: {
        userId: "user_1",
        feature: AiFeature.VACANCY_GENERATION,
        date: new Date("2026-08-09T00:00:00.000Z"),
        reservedTokens: 1_000,
      },
      applicationId: null,
      usage: { model: "gpt-5-nano-2025-08-07", inputTokens: 300, outputTokens: 100, totalTokens: 400 },
    });

    expect(dailyUpdateMock).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user_1", date: new Date("2026-08-09T00:00:00.000Z") } },
      data: { tokenCount: { increment: -600 } },
    });
    expect(usageEventCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        applicationId: null,
        feature: AiFeature.VACANCY_GENERATION,
        model: "gpt-5-nano-2025-08-07",
        inputTokens: 300,
        outputTokens: 100,
        totalTokens: 400,
      },
    });
  });

  it("skips the token reconciliation update when actual usage matches the reservation exactly", async () => {
    await finalizeAiUsage({
      reservation: {
        userId: "user_1",
        feature: AiFeature.HR_GENERATION,
        date: new Date("2026-08-09T00:00:00.000Z"),
        reservedTokens: 400,
      },
      applicationId: "app_1",
      usage: { model: "gpt-5-nano-2025-08-07", inputTokens: 300, outputTokens: 100, totalTokens: 400 },
    });

    expect(dailyUpdateMock).not.toHaveBeenCalled();
    expect(usageEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ applicationId: "app_1" }) }),
    );
  });
});

describe("runGatedAiCall", () => {
  it("counts exact input tokens first, reserves inputTokens + maxOutputTokens, then finalizes with the reported usage on success", async () => {
    const countInputTokens = vi.fn().mockResolvedValue(40);
    const call = vi.fn(async (reportUsage: (usage: AiUsageReport) => void) => {
      reportUsage({ model: "gpt-5-nano-2025-08-07", inputTokens: 10, outputTokens: 5, totalTokens: 15 });
      return "ok";
    });

    const result = await runGatedAiCall({
      userId: "user_1",
      feature: AiFeature.VACANCY_GENERATION,
      applicationId: null,
      maxOutputTokens: 60,
      countInputTokens,
      call,
    });

    expect(result).toBe("ok");
    expect(countInputTokens).toHaveBeenCalledTimes(1);
    expect(dailyUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(dailyUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tokenCount: { lte: 20_000 - 100 } }),
        data: expect.objectContaining({ tokenCount: { increment: 100 } }),
      }),
    );
    expect(call).toHaveBeenCalledTimes(1);
    expect(usageEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
      }),
    );
    expect(dailyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tokenCount: { increment: 15 - 100 } } }),
    );
  });

  it("fails before reserving quota or calling the provider when token counting fails", async () => {
    const countingError = new Error("input-tokens endpoint unavailable");
    const countInputTokens = vi.fn().mockRejectedValue(countingError);
    const call = vi.fn();

    await expect(
      runGatedAiCall({
        userId: "user_1",
        feature: AiFeature.VACANCY_GENERATION,
        maxOutputTokens: 100,
        countInputTokens,
        call,
      }),
    ).rejects.toBe(countingError);

    expect(call).not.toHaveBeenCalled();
    expect(dailyUpdateManyMock).not.toHaveBeenCalled();
    expect(dailyUpdateMock).not.toHaveBeenCalled();
    expect(usageEventCreateMock).not.toHaveBeenCalled();
  });

  it("rolls back the reservation and rethrows when the call fails, without recording usage", async () => {
    const call = vi.fn().mockRejectedValue(new Error("provider exploded"));

    await expect(
      runGatedAiCall({
        userId: "user_1",
        feature: AiFeature.HR_GENERATION,
        maxOutputTokens: 50,
        countInputTokens: () => Promise.resolve(0),
        call,
      }),
    ).rejects.toThrow("provider exploded");

    expect(dailyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { hrGenerationCount: { decrement: 1 }, tokenCount: { decrement: 50 } } }),
    );
    expect(usageEventCreateMock).not.toHaveBeenCalled();
  });

  it("never reserves or rolls back quota when access is not approved", async () => {
    userFindUniqueMock.mockResolvedValue({ aiAccessStatus: AiAccessStatus.PENDING });
    const call = vi.fn();

    await expect(
      runGatedAiCall({
        userId: "user_1",
        feature: AiFeature.VACANCY_GENERATION,
        maxOutputTokens: 100,
        countInputTokens: () => Promise.resolve(0),
        call,
      }),
    ).rejects.toBeInstanceOf(AiAccessError);

    expect(call).not.toHaveBeenCalled();
    expect(dailyUpdateManyMock).not.toHaveBeenCalled();
    expect(dailyUpdateMock).not.toHaveBeenCalled();
  });

  it("fails closed — never rolls back quota — when the provider succeeded but finalization fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    transactionMock.mockRejectedValue(new Error("db connection reset"));
    const call = vi.fn(async (reportUsage: (usage: AiUsageReport) => void) => {
      reportUsage({ model: "gpt-5-nano-2025-08-07", inputTokens: 10, outputTokens: 5, totalTokens: 15 });
      return "ok";
    });

    const result = await runGatedAiCall({
      userId: "user_1",
      feature: AiFeature.VACANCY_GENERATION,
      maxOutputTokens: 100,
      countInputTokens: () => Promise.resolve(0),
      call,
    });

    // The provider call already succeeded and cost real tokens, so the
    // consumed reservation must never be refunded just because the
    // follow-up bookkeeping write failed.
    expect(result).toBe("ok");
    expect(dailyUpdateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ vacancyGenerationCount: { decrement: 1 } }),
      }),
    );
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
