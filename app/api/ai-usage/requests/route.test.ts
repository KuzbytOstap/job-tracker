import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const requestMoreAiUsageMock = vi.fn();
vi.mock("@/lib/ai/access-requests", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/access-requests")>("@/lib/ai/access-requests");
  return {
    ...actual,
    requestMoreAiUsage: (...args: unknown[]) => requestMoreAiUsageMock(...args),
  };
});

import { AiAccessError } from "@/lib/ai/access-control";
import { AiAccessRequestError } from "@/lib/ai/access-requests";
import { AiRequestStatus, AiRequestType } from "@/app/generated/prisma/client";
import { POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/ai-usage/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  checkSessionMock.mockReset();
  requestMoreAiUsageMock.mockReset();
});

describe("POST /api/ai-usage/requests", () => {
  it("returns 401 when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await POST(makeRequest({ type: "VACANCY_LIMIT" }));

    expect(response.status).toBe(401);
    expect(requestMoreAiUsageMock).not.toHaveBeenCalled();
  });

  it("returns 403 when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await POST(makeRequest({ type: "VACANCY_LIMIT" }));

    expect(response.status).toBe(403);
    expect(requestMoreAiUsageMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid type with 400", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);

    const response = await POST(makeRequest({ type: "AI_ACCESS" }));

    expect(response.status).toBe(400);
    expect(requestMoreAiUsageMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with 400", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);

    const response = await POST(
      new NextRequest("http://localhost:3000/api/ai-usage/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
    expect(requestMoreAiUsageMock).not.toHaveBeenCalled();
  });

  it("creates the request and returns PENDING for each usage request type", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestMoreAiUsageMock.mockResolvedValue(AiRequestStatus.PENDING);

    for (const type of [AiRequestType.VACANCY_LIMIT, AiRequestType.HR_LIMIT, AiRequestType.TOKEN_LIMIT]) {
      const response = await POST(makeRequest({ type }));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "PENDING" });
      expect(requestMoreAiUsageMock).toHaveBeenCalledWith("test-user-id", type);
    }
  });

  it("maps an AiAccessError to its structured status/code", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestMoreAiUsageMock.mockRejectedValue(new AiAccessError("AI_SUSPENDED", "AI access has been suspended."));

    const response = await POST(makeRequest({ type: "VACANCY_LIMIT" }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "AI access has been suspended.",
      details: { code: "AI_SUSPENDED" },
    });
  });

  it("maps QUOTA_NOT_EXHAUSTED to 409 with the error code", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestMoreAiUsageMock.mockRejectedValue(
      new AiAccessRequestError("QUOTA_NOT_EXHAUSTED", "This quota isn't exhausted yet."),
    );

    const response = await POST(makeRequest({ type: "VACANCY_LIMIT" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "This quota isn't exhausted yet.",
      details: { code: "QUOTA_NOT_EXHAUSTED" },
    });
  });

  it("maps NOT_ELIGIBLE (duplicate pending request) to 409", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestMoreAiUsageMock.mockRejectedValue(
      new AiAccessRequestError("NOT_ELIGIBLE", "A request for this quota is already pending."),
    );

    const response = await POST(makeRequest({ type: "HR_LIMIT" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "A request for this quota is already pending.",
      details: { code: "NOT_ELIGIBLE" },
    });
  });

  it("returns 500 for unexpected errors", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    requestMoreAiUsageMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest({ type: "VACANCY_LIMIT" }));

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
