import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  suggestCvUpdates: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cv-update-hint", () => ({
  suggestCvUpdates: (...args: unknown[]) => mocks.suggestCvUpdates(...args),
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

describe("POST /api/profile/cv-update-hint/suggestions", () => {
  it("returns 401 before calling AI when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await POST()).status).toBe(401);
    expect(mocks.suggestCvUpdates).not.toHaveBeenCalled();
  });

  it("returns the suggestions for the signed in user", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.suggestCvUpdates.mockResolvedValue({
      status: "ok",
      suggestions: [{ itemId: "i1", bullet: "Shipped passkeys on iOS and Android" }],
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      suggestions: [{ itemId: "i1", bullet: "Shipped passkeys on iOS and Android" }],
    });
    expect(mocks.suggestCvUpdates).toHaveBeenCalledWith("test-user-id");
  });

  it("returns 200 with the skip reason for a user without AI access", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.suggestCvUpdates.mockResolvedValue({ status: "skipped", reason: "AI_ACCESS_REQUIRED" });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "skipped", reason: "AI_ACCESS_REQUIRED" });
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.suggestCvUpdates.mockRejectedValue(new Error("db down"));

    expect((await POST()).status).toBe(500);
  });
});
