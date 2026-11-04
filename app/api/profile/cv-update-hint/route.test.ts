import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  getCvUpdateHint: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cv-update-hint", () => ({
  getCvUpdateHint: (...args: unknown[]) => mocks.getCvUpdateHint(...args),
}));

import { GET } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/profile/cv-update-hint", () => {
  it("returns 401 before reading anything when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await GET()).status).toBe(401);
    expect(mocks.getCvUpdateHint).not.toHaveBeenCalled();
  });

  it("returns the hint state for the signed in user without caching", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.getCvUpdateHint.mockResolvedValue({ visible: true, substantialCount: 2, snoozed: false });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ visible: true, substantialCount: 2, snoozed: false });
    expect(mocks.getCvUpdateHint).toHaveBeenCalledWith("test-user-id");
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.getCvUpdateHint.mockRejectedValue(new Error("db down"));

    expect((await GET()).status).toBe(500);
  });
});
