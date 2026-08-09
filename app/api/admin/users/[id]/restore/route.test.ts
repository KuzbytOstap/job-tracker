import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AdminCheck } from "@/lib/admin/require-admin";

const requireAdminMock = vi.fn<() => Promise<AdminCheck>>();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

const restoreAiAccessMock = vi.fn();
vi.mock("@/lib/admin/users", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/users")>("@/lib/admin/users");
  return {
    ...actual,
    restoreAiAccess: (...args: unknown[]) => restoreAiAccessMock(...args),
  };
});

import { AiAccessStatus } from "@/app/generated/prisma/client";
import { AdminUserError } from "@/lib/admin/users";
import { POST } from "./route";

const params = Promise.resolve({ id: "user_1" });
const ADMIN: AdminCheck = { status: "authorized", userId: "admin_1" };
const req = new NextRequest("http://localhost/api/admin/users/user_1/restore", { method: "POST" });

beforeEach(() => {
  requireAdminMock.mockReset();
  restoreAiAccessMock.mockReset();
});

describe("POST /api/admin/users/[id]/restore", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await POST(req, { params });

    expect(response.status).toBe(401);
    expect(restoreAiAccessMock).not.toHaveBeenCalled();
  });

  it("returns 403 (non-leaky) for a signed-in non-admin user", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await POST(req, { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(restoreAiAccessMock).not.toHaveBeenCalled();
  });

  it("restores the target user's AI access for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    restoreAiAccessMock.mockResolvedValue(AiAccessStatus.APPROVED);

    const response = await POST(req, { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "APPROVED" });
    expect(restoreAiAccessMock).toHaveBeenCalledWith("user_1");
  });

  it("maps AdminUserError to its status code", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    restoreAiAccessMock.mockRejectedValue(
      new AdminUserError("INVALID_TRANSITION", "Only a SUSPENDED user's AI access can be restored."),
    );

    const response = await POST(req, { params });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Only a SUSPENDED user's AI access can be restored.",
      details: { code: "INVALID_TRANSITION" },
    });
  });

  it("returns 500 for unexpected errors", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    restoreAiAccessMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(req, { params });

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
