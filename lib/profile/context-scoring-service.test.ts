import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listUnscoredContextItems: vi.fn(),
  setContextItemScore: vi.fn(),
  getPrimaryCvText: vi.fn(),
  runProfileOperation: vi.fn(),
}));

vi.mock("@/lib/profile/context-items-service", () => ({
  listUnscoredContextItems: (...args: unknown[]) => mocks.listUnscoredContextItems(...args),
  setContextItemScore: (...args: unknown[]) => mocks.setContextItemScore(...args),
}));

vi.mock("@/lib/profile/cv-service", () => ({
  getPrimaryCvText: (...args: unknown[]) => mocks.getPrimaryCvText(...args),
}));

vi.mock("@/lib/profile/run-profile-ai", () => ({
  runProfileOperation: (...args: unknown[]) => mocks.runProfileOperation(...args),
}));

import { scorePendingContextItems } from "@/lib/profile/context-scoring-service";

const PENDING = [
  { id: "a", text: "text a" },
  { id: "b", text: "text b" },
  { id: "c", text: "text c" },
];

const SUBSTANTIAL = { ok: true, result: { weight: "SUBSTANTIAL", impact: 4 } };

beforeEach(() => {
  mocks.listUnscoredContextItems.mockReset();
  mocks.setContextItemScore.mockReset();
  mocks.getPrimaryCvText.mockReset();
  mocks.runProfileOperation.mockReset();
  mocks.listUnscoredContextItems.mockResolvedValue(PENDING);
  mocks.getPrimaryCvText.mockResolvedValue("My CV");
  mocks.setContextItemScore.mockResolvedValue(true);
});

describe("scorePendingContextItems", () => {
  it("returns zeros without reading the CV when nothing is pending", async () => {
    mocks.listUnscoredContextItems.mockResolvedValue([]);

    await expect(scorePendingContextItems("user_1", { limit: 5 })).resolves.toEqual({
      scored: 0,
      remaining: 0,
      skipped: null,
    });
    expect(mocks.getPrimaryCvText).not.toHaveBeenCalled();
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
  });

  it("reports NO_CV_TEXT with the pending count and makes no AI call when the primary CV has no text", async () => {
    mocks.getPrimaryCvText.mockResolvedValue(null);

    await expect(scorePendingContextItems("user_1", { limit: 5 })).resolves.toEqual({
      scored: 0,
      remaining: 3,
      skipped: "NO_CV_TEXT",
    });
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
  });

  it("scores items in the order given up to the limit and reports the rest as remaining", async () => {
    mocks.runProfileOperation.mockResolvedValue(SUBSTANTIAL);

    const result = await scorePendingContextItems("user_1", { limit: 2 });

    expect(result).toEqual({ scored: 2, remaining: 1, skipped: null });
    expect(mocks.runProfileOperation).toHaveBeenCalledTimes(2);
    expect(mocks.setContextItemScore).toHaveBeenNthCalledWith(1, "user_1", "a", "text a", SUBSTANTIAL.result);
    expect(mocks.setContextItemScore).toHaveBeenNthCalledWith(2, "user_1", "b", "text b", SUBSTANTIAL.result);
  });

  it("sends the CV text and the note text to the scoring operation", async () => {
    mocks.runProfileOperation.mockResolvedValue(SUBSTANTIAL);

    await scorePendingContextItems("user_1", { limit: 1 });

    const params = mocks.runProfileOperation.mock.calls[0][0];
    expect(params.input).toEqual({ cvText: "My CV", itemText: "text a" });
    expect(params.select({ scoreContextItem: "score-operation" })).toBe("score-operation");
  });

  it("stops at the first quota error and leaves the rest unscored", async () => {
    mocks.runProfileOperation
      .mockResolvedValueOnce(SUBSTANTIAL)
      .mockResolvedValueOnce({ ok: false, reason: "PROFILE_LIMIT_REACHED" });

    const result = await scorePendingContextItems("user_1", { limit: 5 });

    expect(result).toEqual({ scored: 1, remaining: 2, skipped: "PROFILE_LIMIT_REACHED" });
    expect(mocks.runProfileOperation).toHaveBeenCalledTimes(2);
    expect(mocks.setContextItemScore).toHaveBeenCalledTimes(1);
  });

  it("leaves every item unscored when the provider fails on the first one", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: false, reason: "PROVIDER_FAILED" });

    await expect(scorePendingContextItems("user_1", { limit: 5 })).resolves.toEqual({
      scored: 0,
      remaining: 3,
      skipped: "PROVIDER_FAILED",
    });
    expect(mocks.setContextItemScore).not.toHaveBeenCalled();
  });

  it("does not count an item whose text changed while it was being scored", async () => {
    mocks.listUnscoredContextItems.mockResolvedValue([PENDING[0]]);
    mocks.runProfileOperation.mockResolvedValue(SUBSTANTIAL);
    mocks.setContextItemScore.mockResolvedValue(false);

    await expect(scorePendingContextItems("user_1", { limit: 5 })).resolves.toEqual({
      scored: 0,
      remaining: 1,
      skipped: null,
    });
  });
});
