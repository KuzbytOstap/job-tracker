import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  scorePendingContextItems: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/context-scoring-service", () => ({
  scorePendingContextItems: (...args: unknown[]) => mocks.scorePendingContextItems(...args),
}));

import { POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/profile/context-items/score", () => {
  it("returns 401 and 403 before scoring anything", async () => {
    mocks.checkSession.mockResolvedValueOnce({ status: "unauthenticated" });
    expect((await POST()).status).toBe(401);

    mocks.checkSession.mockResolvedValueOnce({ status: "forbidden" });
    expect((await POST()).status).toBe(403);

    expect(mocks.scorePendingContextItems).not.toHaveBeenCalled();
  });

  it("scores one batch of 5 for the signed in user and returns the remaining count", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.scorePendingContextItems.mockResolvedValue({ scored: 5, remaining: 3, skipped: null });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scored: 5, remaining: 3, skipped: null });
    expect(mocks.scorePendingContextItems).toHaveBeenCalledWith("test-user-id", { limit: 5 });
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.scorePendingContextItems.mockRejectedValue(new Error("db down"));

    expect((await POST()).status).toBe(500);
  });
});
