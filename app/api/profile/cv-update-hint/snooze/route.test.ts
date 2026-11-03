import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  snoozeCvUpdateHint: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cv-update-hint", () => ({
  snoozeCvUpdateHint: (...args: unknown[]) => mocks.snoozeCvUpdateHint(...args),
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

describe("POST /api/profile/cv-update-hint/snooze", () => {
  it("returns 401 before writing anything when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await POST()).status).toBe(401);
    expect(mocks.snoozeCvUpdateHint).not.toHaveBeenCalled();
  });

  it("snoozes the hint for the signed in user and returns the hidden state", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.snoozeCvUpdateHint.mockResolvedValue({ visible: false, substantialCount: 2, snoozed: true });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ visible: false, substantialCount: 2, snoozed: true });
    expect(mocks.snoozeCvUpdateHint).toHaveBeenCalledWith("test-user-id");
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.snoozeCvUpdateHint.mockRejectedValue(new Error("db down"));

    expect((await POST()).status).toBe(500);
  });
});
