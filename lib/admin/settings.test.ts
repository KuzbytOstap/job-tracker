import { beforeEach, describe, expect, it, vi } from "vitest";

const aiGlobalLimitsUpsertMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiGlobalLimits: { upsert: (...args: unknown[]) => aiGlobalLimitsUpsertMock(...args) },
  },
}));

import { getAiGlobalLimits, updateAiGlobalLimits } from "@/lib/admin/settings";

beforeEach(() => {
  aiGlobalLimitsUpsertMock.mockReset();
});

describe("getAiGlobalLimits", () => {
  it("upserts the id=1 singleton, creating it with schema defaults if missing", async () => {
    aiGlobalLimitsUpsertMock.mockResolvedValue({
      id: 1,
      vacancyGenerationLimit: 10,
      hrGenerationLimit: 10,
      tokenLimit: 20_000,
      updatedAt: new Date(),
    });

    await getAiGlobalLimits();

    expect(aiGlobalLimitsUpsertMock).toHaveBeenCalledWith({ where: { id: 1 }, create: {}, update: {} });
  });
});

describe("updateAiGlobalLimits", () => {
  it("only writes the fields provided, leaving the others (10/10/20000 defaults) untouched", async () => {
    aiGlobalLimitsUpsertMock.mockResolvedValue({
      id: 1,
      vacancyGenerationLimit: 25,
      hrGenerationLimit: 10,
      tokenLimit: 20_000,
      updatedAt: new Date(),
    });

    await updateAiGlobalLimits({ vacancyGenerationLimit: 25 });

    expect(aiGlobalLimitsUpsertMock).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, vacancyGenerationLimit: 25 },
      update: { vacancyGenerationLimit: 25 },
    });
  });

  it("passes an empty update through unchanged when no fields are provided", async () => {
    aiGlobalLimitsUpsertMock.mockResolvedValue({
      id: 1,
      vacancyGenerationLimit: 10,
      hrGenerationLimit: 10,
      tokenLimit: 20_000,
      updatedAt: new Date(),
    });

    await updateAiGlobalLimits({});

    expect(aiGlobalLimitsUpsertMock).toHaveBeenCalledWith({ where: { id: 1 }, create: { id: 1 }, update: {} });
  });
});
