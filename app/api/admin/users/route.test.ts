import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminCheck } from "@/lib/admin/require-admin";

const requireAdminMock = vi.fn<() => Promise<AdminCheck>>();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

const listAdminUsersMock = vi.fn();
vi.mock("@/lib/admin/users", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/users")>("@/lib/admin/users");
  return {
    ...actual,
    listAdminUsers: (...args: unknown[]) => listAdminUsersMock(...args),
  };
});

import { AiAccessStatus, Role } from "@/app/generated/prisma/client";
import { GET } from "./route";

const ADMIN: AdminCheck = { status: "authorized", userId: "admin_1" };

beforeEach(() => {
  requireAdminMock.mockReset();
  listAdminUsersMock.mockReset();
});

describe("GET /api/admin/users", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listAdminUsersMock).not.toHaveBeenCalled();
  });

  it("returns 403 (non-leaky) for a signed-in non-admin user", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(listAdminUsersMock).not.toHaveBeenCalled();
  });

  it("lists users with usage/limits for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    listAdminUsersMock.mockResolvedValue([
      {
        id: "user_1",
        name: "Ada",
        email: "ada@example.com",
        role: Role.USER,
        aiAccessStatus: AiAccessStatus.APPROVED,
        usage: { vacancy: 2, hr: 1, tokens: 500 },
        limits: { vacancy: 10, hr: 10, tokens: 20_000 },
        overrides: { vacancy: null, hr: null, tokens: null },
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(listAdminUsersMock).toHaveBeenCalledWith();
    const body = await response.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0].id).toBe("user_1");
  });

  it("returns 500 for unexpected errors", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    listAdminUsersMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
