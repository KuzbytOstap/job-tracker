import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AdminCheck } from "@/lib/admin/require-admin";

const requireAdminMock = vi.fn<() => Promise<AdminCheck>>();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

const getAiGlobalLimitsMock = vi.fn();
const updateAiGlobalLimitsMock = vi.fn();
vi.mock("@/lib/admin/settings", () => ({
  getAiGlobalLimits: (...args: unknown[]) => getAiGlobalLimitsMock(...args),
  updateAiGlobalLimits: (...args: unknown[]) => updateAiGlobalLimitsMock(...args),
}));

import { GET, PATCH } from "./route";

const ADMIN: AdminCheck = { status: "authorized", userId: "admin_1" };

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/settings", { method: "PATCH", body: JSON.stringify(body) });
}

beforeEach(() => {
  requireAdminMock.mockReset();
  getAiGlobalLimitsMock.mockReset();
  updateAiGlobalLimitsMock.mockReset();
});

describe("GET /api/admin/settings", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getAiGlobalLimitsMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin user", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(getAiGlobalLimitsMock).not.toHaveBeenCalled();
  });

  it("returns the current defaults for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    getAiGlobalLimitsMock.mockResolvedValue({
      id: 1,
      vacancyGenerationLimit: 10,
      hrGenerationLimit: 10,
      tokenLimit: 20_000,
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      vacancyGenerationLimit: 10,
      hrGenerationLimit: 10,
      tokenLimit: 20_000,
      updatedAt: "2026-08-01T00:00:00.000Z",
    });
  });
});

describe("PATCH /api/admin/settings", () => {
  it("returns 403 for a non-admin user and never writes", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await PATCH(patchRequest({ vacancyGenerationLimit: 50 }));

    expect(response.status).toBe(403);
    expect(updateAiGlobalLimitsMock).not.toHaveBeenCalled();
  });

  it("rejects a negative limit as invalid", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const response = await PATCH(patchRequest({ vacancyGenerationLimit: -1 }));

    expect(response.status).toBe(400);
    expect(updateAiGlobalLimitsMock).not.toHaveBeenCalled();
  });

  it("rejects a non-integer limit as invalid", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const response = await PATCH(patchRequest({ tokenLimit: 12.5 }));

    expect(response.status).toBe(400);
    expect(updateAiGlobalLimitsMock).not.toHaveBeenCalled();
  });

  it("updates only the provided fields for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    updateAiGlobalLimitsMock.mockResolvedValue({
      id: 1,
      vacancyGenerationLimit: 50,
      hrGenerationLimit: 10,
      tokenLimit: 20_000,
      updatedAt: new Date("2026-08-09T00:00:00.000Z"),
    });

    const response = await PATCH(patchRequest({ vacancyGenerationLimit: 50 }));

    expect(response.status).toBe(200);
    expect(updateAiGlobalLimitsMock).toHaveBeenCalledWith({ vacancyGenerationLimit: 50 });
    expect((await response.json()).vacancyGenerationLimit).toBe(50);
  });
});
