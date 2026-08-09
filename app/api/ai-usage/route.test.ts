import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const getAiUsageStatusMock = vi.fn();
vi.mock("@/lib/ai/access-control", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/access-control")>("@/lib/ai/access-control");
  return {
    ...actual,
    getAiUsageStatus: (...args: unknown[]) => getAiUsageStatusMock(...args),
  };
});

const getPendingUsageRequestTypesMock = vi.fn();
vi.mock("@/lib/ai/access-requests", () => ({
  getPendingUsageRequestTypes: (...args: unknown[]) => getPendingUsageRequestTypesMock(...args),
}));

import { AiAccessError } from "@/lib/ai/access-control";
import { GET } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const USAGE = {
  resetAt: "2026-08-10T00:00:00.000Z",
  vacancy: { used: 10, limit: 10, exhausted: true },
  hr: { used: 2, limit: 10, exhausted: false },
  tokens: { used: 500, limit: 20_000, exhausted: false },
};

beforeEach(() => {
  checkSessionMock.mockReset();
  getAiUsageStatusMock.mockReset();
  getPendingUsageRequestTypesMock.mockReset();
});

describe("GET /api/ai-usage", () => {
  it("returns 401 when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getAiUsageStatusMock).not.toHaveBeenCalled();
  });

  it("returns 403 when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(getAiUsageStatusMock).not.toHaveBeenCalled();
  });

  it("returns usage merged with pending-request flags per quota", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getAiUsageStatusMock.mockResolvedValue(USAGE);
    getPendingUsageRequestTypesMock.mockResolvedValue(["VACANCY_LIMIT"]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      resetAt: USAGE.resetAt,
      vacancy: { ...USAGE.vacancy, pendingRequest: true },
      hr: { ...USAGE.hr, pendingRequest: false },
      tokens: { ...USAGE.tokens, pendingRequest: false },
    });
    expect(getAiUsageStatusMock).toHaveBeenCalledWith("test-user-id");
    expect(getPendingUsageRequestTypesMock).toHaveBeenCalledWith("test-user-id");
  });

  it("maps an AiAccessError to a structured error response", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getAiUsageStatusMock.mockRejectedValue(new AiAccessError("AI_ACCESS_REQUIRED", "AI access has not been approved yet."));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "AI access has not been approved yet.",
      details: { code: "AI_ACCESS_REQUIRED" },
    });
  });

  it("returns 500 for unexpected errors", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getAiUsageStatusMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
