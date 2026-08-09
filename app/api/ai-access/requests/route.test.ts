import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const requestAiAccessMock = vi.fn();
vi.mock("@/lib/ai/access-requests", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/access-requests")>("@/lib/ai/access-requests");
  return {
    ...actual,
    requestAiAccess: (...args: unknown[]) => requestAiAccessMock(...args),
  };
});

import { AiAccessStatus } from "@/app/generated/prisma/client";
import { AiAccessRequestError } from "@/lib/ai/access-requests";
import { POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

beforeEach(() => {
  checkSessionMock.mockReset();
  requestAiAccessMock.mockReset();
});

describe("POST /api/ai-access/requests", () => {
  it("returns 401 when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(requestAiAccessMock).not.toHaveBeenCalled();
  });

  it("returns 403 when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await POST();

    expect(response.status).toBe(403);
    expect(requestAiAccessMock).not.toHaveBeenCalled();
  });

  it("creates the request and returns PENDING for an eligible user", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestAiAccessMock.mockResolvedValue(AiAccessStatus.PENDING);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "PENDING" });
    expect(requestAiAccessMock).toHaveBeenCalledWith("test-user-id");
  });

  it("returns 409 with the error code when the user isn't eligible", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestAiAccessMock.mockRejectedValue(
      new AiAccessRequestError("NOT_ELIGIBLE", "AI access has already been requested or decided for this account."),
    );

    const response = await POST();

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "AI access has already been requested or decided for this account.",
      details: { code: "NOT_ELIGIBLE" },
    });
  });

  it("returns 500 for unexpected errors", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestAiAccessMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST();

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
