import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AdminCheck } from "@/lib/admin/require-admin";

const requireAdminMock = vi.fn<() => Promise<AdminCheck>>();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

const listAiRequestsMock = vi.fn();
vi.mock("@/lib/admin/ai-requests", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/ai-requests")>("@/lib/admin/ai-requests");
  return {
    ...actual,
    listAiRequests: (...args: unknown[]) => listAiRequestsMock(...args),
  };
});

import { AiRequestStatus, AiRequestType } from "@/app/generated/prisma/client";
import { GET } from "./route";

const ADMIN: AdminCheck = { status: "authorized", userId: "admin_1" };

function request(query = "") {
  return new NextRequest(`http://localhost/api/admin/ai-requests${query}`);
}

beforeEach(() => {
  requireAdminMock.mockReset();
  listAiRequestsMock.mockReset();
});

describe("GET /api/admin/ai-requests", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(listAiRequestsMock).not.toHaveBeenCalled();
  });

  it("returns 403 (non-leaky) for a signed-in non-admin user", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(listAiRequestsMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid filter", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const response = await GET(request("?status=MAYBE"));

    expect(response.status).toBe(400);
    expect(listAiRequestsMock).not.toHaveBeenCalled();
  });

  it("lists requests for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    listAiRequestsMock.mockResolvedValue([
      {
        id: "req_1",
        type: AiRequestType.AI_ACCESS,
        status: AiRequestStatus.PENDING,
        quotaDate: null,
        message: null,
        decidedAt: null,
        decisionNote: null,
        grantedAmount: null,
        createdAt: "2026-08-09T10:00:00.000Z",
        updatedAt: "2026-08-09T10:00:00.000Z",
        user: { id: "user_1", name: "Ada", email: "ada@example.com" },
        decidedByUser: null,
      },
    ]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(listAiRequestsMock).toHaveBeenCalledWith({ status: undefined, type: undefined });
    const body = await response.json();
    expect(body.requests).toHaveLength(1);
    expect(body.requests[0].id).toBe("req_1");
  });

  it("passes status/type filters through to the query", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    listAiRequestsMock.mockResolvedValue([]);

    const response = await GET(request(`?status=${AiRequestStatus.PENDING}&type=${AiRequestType.VACANCY_LIMIT}`));

    expect(response.status).toBe(200);
    expect(listAiRequestsMock).toHaveBeenCalledWith({
      status: AiRequestStatus.PENDING,
      type: AiRequestType.VACANCY_LIMIT,
    });
  });

  it("returns 500 for unexpected errors", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    listAiRequestsMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request());

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
