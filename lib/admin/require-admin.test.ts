import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const userFindUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
  },
}));

import { Role } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/lib/admin/require-admin";

const AUTHORIZED_USER: SessionCheck = {
  status: "authorized",
  session: { user: { id: "user_1", email: "me@example.com" }, expires: new Date().toISOString() },
};

beforeEach(() => {
  checkSessionMock.mockReset();
  userFindUniqueMock.mockReset();
});

describe("requireAdmin", () => {
  it("returns unauthenticated when there is no session", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    await expect(requireAdmin()).resolves.toEqual({ status: "unauthenticated" });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns forbidden when the session itself is forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    await expect(requireAdmin()).resolves.toEqual({ status: "forbidden" });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns forbidden for a signed-in non-admin user", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED_USER);
    userFindUniqueMock.mockResolvedValue({ role: Role.USER });

    await expect(requireAdmin()).resolves.toEqual({ status: "forbidden" });
  });

  it("returns forbidden (never leaks NOT_FOUND) when the user row is missing", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED_USER);
    userFindUniqueMock.mockResolvedValue(null);

    await expect(requireAdmin()).resolves.toEqual({ status: "forbidden" });
  });

  it("returns authorized with the userId for a persisted ADMIN role", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED_USER);
    userFindUniqueMock.mockResolvedValue({ role: Role.ADMIN });

    await expect(requireAdmin()).resolves.toEqual({ status: "authorized", userId: "user_1" });
    expect(userFindUniqueMock).toHaveBeenCalledWith({ where: { id: "user_1" }, select: { role: true } });
  });
});
