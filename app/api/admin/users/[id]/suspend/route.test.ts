import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AdminCheck } from "@/lib/admin/require-admin";

const requireAdminMock = vi.fn<() => Promise<AdminCheck>>();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

const suspendAiAccessMock = vi.fn();
vi.mock("@/lib/admin/users", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/users")>("@/lib/admin/users");
  return {
    ...actual,
    suspendAiAccess: (...args: unknown[]) => suspendAiAccessMock(...args),
  };
});

import { AiAccessStatus } from "@/app/generated/prisma/client";
import { AdminUserError } from "@/lib/admin/users";
import { POST } from "./route";

const params = Promise.resolve({ id: "user_1" });
const ADMIN: AdminCheck = { status: "authorized", userId: "admin_1" };
const req = new NextRequest("http://localhost/api/admin/users/user_1/suspend", { method: "POST" });

beforeEach(() => {
  requireAdminMock.mockReset();
  suspendAiAccessMock.mockReset();
});

describe("POST /api/admin/users/[id]/suspend", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await POST(req, { params });

    expect(response.status).toBe(401);
    expect(suspendAiAccessMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a signed-in non-admin user", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await POST(req, { params });

    expect(response.status).toBe(403);
    expect(suspendAiAccessMock).not.toHaveBeenCalled();
  });

  it("suspends the target user's AI access for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    suspendAiAccessMock.mockResolvedValue(AiAccessStatus.SUSPENDED);

    const response = await POST(req, { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "SUSPENDED" });
    expect(suspendAiAccessMock).toHaveBeenCalledWith("user_1");
  });

  it("maps AdminUserError to its status code", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    suspendAiAccessMock.mockRejectedValue(
      new AdminUserError("INVALID_TRANSITION", "Only a user with APPROVED AI access can be suspended."),
    );

    const response = await POST(req, { params });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Only a user with APPROVED AI access can be suspended.",
      details: { code: "INVALID_TRANSITION" },
    });
  });
});
