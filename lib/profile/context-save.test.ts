import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  scorePendingContextItems: vi.fn(),
  getContextItem: vi.fn(),
}));

vi.mock("@/lib/profile/context-scoring-service", () => ({
  scorePendingContextItems: (...args: unknown[]) => mocks.scorePendingContextItems(...args),
}));
vi.mock("@/lib/profile/context-items-service", () => ({
  getContextItem: (...args: unknown[]) => mocks.getContextItem(...args),
}));

import { scoreAfterSave } from "@/lib/profile/context-save";

const ITEM = { id: "item_1", text: "Shipped passkeys", weight: "SUBSTANTIAL", impact: 4 };

beforeEach(() => {
  mocks.scorePendingContextItems.mockReset();
  mocks.getContextItem.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("scoreAfterSave", () => {
  it("scores one batch of 5 and returns the refreshed item with the scoring summary", async () => {
    mocks.scorePendingContextItems.mockResolvedValue({ scored: 1, remaining: 0, skipped: null });
    mocks.getContextItem.mockResolvedValue(ITEM);

    const result = await scoreAfterSave("user_1", "item_1");

    expect(mocks.scorePendingContextItems).toHaveBeenCalledWith("user_1", { limit: 5 });
    expect(mocks.getContextItem).toHaveBeenCalledWith("user_1", "item_1");
    expect(result).toEqual({ item: ITEM, scoring: { scored: 1, remaining: 0, skipped: null } });
  });

  it("returns the saved item with the skip reason when scoring is skipped for quota", async () => {
    mocks.scorePendingContextItems.mockResolvedValue({ scored: 0, remaining: 1, skipped: "PROFILE_LIMIT_REACHED" });
    mocks.getContextItem.mockResolvedValue({ ...ITEM, weight: null, impact: null });

    const result = await scoreAfterSave("user_1", "item_1");

    expect(result?.item.weight).toBeNull();
    expect(result?.scoring.skipped).toBe("PROFILE_LIMIT_REACHED");
  });

  it("does not lose the save when scoring throws unexpectedly", async () => {
    mocks.scorePendingContextItems.mockRejectedValue(new Error("db down"));
    mocks.getContextItem.mockResolvedValue({ ...ITEM, weight: null, impact: null });

    const result = await scoreAfterSave("user_1", "item_1");

    expect(result?.item.id).toBe("item_1");
    expect(result?.scoring).toEqual({ scored: 0, remaining: 0, skipped: "PROVIDER_FAILED" });
  });

  it("returns null when the item no longer exists", async () => {
    mocks.scorePendingContextItems.mockResolvedValue({ scored: 0, remaining: 0, skipped: null });
    mocks.getContextItem.mockResolvedValue(null);

    await expect(scoreAfterSave("user_1", "item_1")).resolves.toBeNull();
  });
});
