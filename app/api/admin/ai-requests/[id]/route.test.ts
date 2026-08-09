import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AdminCheck } from "@/lib/admin/require-admin";

const requireAdminMock = vi.fn<() => Promise<AdminCheck>>();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

const decideAiRequestMock = vi.fn();
vi.mock("@/lib/admin/ai-requests", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/ai-requests")>("@/lib/admin/ai-requests");
  return {
    ...actual,
    decideAiRequest: (...args: unknown[]) => decideAiRequestMock(...args),
  };
});

import { AiRequestStatus, AiRequestType } from "@/app/generated/prisma/client";
import { AdminAiRequestError } from "@/lib/admin/ai-requests";
import { PATCH } from "./route";

const params = Promise.resolve({ id: "req_1" });
const ADMIN: AdminCheck = { status: "authorized", userId: "admin_1" };

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/ai-requests/req_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireAdminMock.mockReset();
  decideAiRequestMock.mockReset();
});

describe("PATCH /api/admin/ai-requests/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await PATCH(request({ decision: "APPROVED" }), { params });

    expect(response.status).toBe(401);
    expect(decideAiRequestMock).not.toHaveBeenCalled();
  });

  it("returns 403 (non-leaky) for a signed-in non-admin user", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await PATCH(request({ decision: "APPROVED" }), { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(decideAiRequestMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const response = await PATCH(request({ decision: "MAYBE" }), { params });

    expect(response.status).toBe(400);
    expect(decideAiRequestMock).not.toHaveBeenCalled();
  });

  it("decides the request and returns the updated DTO for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    decideAiRequestMock.mockResolvedValue({
      id: "req_1",
      type: AiRequestType.AI_ACCESS,
      status: AiRequestStatus.APPROVED,
      quotaDate: null,
      message: null,
      decidedAt: "2026-08-09T12:00:00.000Z",
      decisionNote: "welcome aboard",
      grantedAmount: null,
      createdAt: "2026-08-09T10:00:00.000Z",
      updatedAt: "2026-08-09T12:00:00.000Z",
      user: { id: "user_1", name: "Ada", email: "ada@example.com" },
      decidedByUser: { id: "admin_1", name: "Admin", email: "admin@example.com" },
    });

    const response = await PATCH(request({ decision: "APPROVED", decisionNote: "welcome aboard" }), { params });

    expect(response.status).toBe(200);
    expect(decideAiRequestMock).toHaveBeenCalledWith({
      requestId: "req_1",
      adminUserId: "admin_1",
      decision: "APPROVED",
      decisionNote: "welcome aboard",
      grantedAmount: null,
    });
    const body = await response.json();
    expect(body.status).toBe(AiRequestStatus.APPROVED);
  });

  it("maps AdminAiRequestError to its status code", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    decideAiRequestMock.mockRejectedValue(new AdminAiRequestError("STALE_REQUEST", "too old"));

    const response = await PATCH(request({ decision: "APPROVED", grantedAmount: 5 }), { params });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "too old", details: { code: "STALE_REQUEST" } });
  });

  it("returns 500 for unexpected errors", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    decideAiRequestMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PATCH(request({ decision: "APPROVED" }), { params });

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
