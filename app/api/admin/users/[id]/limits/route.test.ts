import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { AdminCheck } from "@/lib/admin/require-admin";

const requireAdminMock = vi.fn<() => Promise<AdminCheck>>();
vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: () => requireAdminMock(),
}));

const setAiUserLimitOverridesMock = vi.fn();
vi.mock("@/lib/admin/users", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/users")>("@/lib/admin/users");
  return {
    ...actual,
    setAiUserLimitOverrides: (...args: unknown[]) => setAiUserLimitOverridesMock(...args),
  };
});

import { AdminUserError } from "@/lib/admin/users";
import { PATCH } from "./route";

const params = Promise.resolve({ id: "user_1" });
const ADMIN: AdminCheck = { status: "authorized", userId: "admin_1" };

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/users/user_1/limits", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireAdminMock.mockReset();
  setAiUserLimitOverridesMock.mockReset();
});

describe("PATCH /api/admin/users/[id]/limits", () => {
  it("returns 401 when unauthenticated", async () => {
    requireAdminMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await PATCH(request({ vacancyGenerationLimit: 20 }), { params });

    expect(response.status).toBe(401);
    expect(setAiUserLimitOverridesMock).not.toHaveBeenCalled();
  });

  it("returns 403 (non-leaky) for a signed-in non-admin user", async () => {
    requireAdminMock.mockResolvedValue({ status: "forbidden" });

    const response = await PATCH(request({ vacancyGenerationLimit: 20 }), { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(setAiUserLimitOverridesMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const response = await PATCH(request({ vacancyGenerationLimit: -1 }), { params });

    expect(response.status).toBe(400);
    expect(setAiUserLimitOverridesMock).not.toHaveBeenCalled();
  });

  it("sets overrides and returns them for an admin", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    setAiUserLimitOverridesMock.mockResolvedValue({ vacancy: 20, hr: null, tokens: null });

    const response = await PATCH(request({ vacancyGenerationLimit: 20, hrGenerationLimit: null }), { params });

    expect(response.status).toBe(200);
    expect(setAiUserLimitOverridesMock).toHaveBeenCalledWith("user_1", {
      vacancyGenerationLimit: 20,
      hrGenerationLimit: null,
    });
    expect(await response.json()).toEqual({ vacancy: 20, hr: null, tokens: null });
  });

  it("accepts a profile limit override and null to clear it", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    setAiUserLimitOverridesMock.mockResolvedValue({ vacancy: null, hr: null, profile: 12, tokens: null });

    const pinned = await PATCH(request({ profileGenerationLimit: 12 }), { params });
    expect(pinned.status).toBe(200);
    expect(setAiUserLimitOverridesMock).toHaveBeenCalledWith("user_1", { profileGenerationLimit: 12 });
    expect(await pinned.json()).toEqual({ vacancy: null, hr: null, profile: 12, tokens: null });

    const cleared = await PATCH(request({ profileGenerationLimit: null }), { params });
    expect(cleared.status).toBe(200);
    expect(setAiUserLimitOverridesMock).toHaveBeenLastCalledWith("user_1", { profileGenerationLimit: null });
  });

  it("accepts a cover letter limit override and null to clear it", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    setAiUserLimitOverridesMock.mockResolvedValue({
      vacancy: null,
      hr: null,
      profile: null,
      coverLetter: 7,
      tokens: null,
    });

    const pinned = await PATCH(request({ coverLetterGenerationLimit: 7 }), { params });
    expect(pinned.status).toBe(200);
    expect(setAiUserLimitOverridesMock).toHaveBeenCalledWith("user_1", { coverLetterGenerationLimit: 7 });
    expect(await pinned.json()).toEqual({ vacancy: null, hr: null, profile: null, coverLetter: 7, tokens: null });

    const cleared = await PATCH(request({ coverLetterGenerationLimit: null }), { params });
    expect(cleared.status).toBe(200);
    expect(setAiUserLimitOverridesMock).toHaveBeenLastCalledWith("user_1", { coverLetterGenerationLimit: null });
  });

  it("rejects a negative cover letter limit override", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const response = await PATCH(request({ coverLetterGenerationLimit: -5 }), { params });

    expect(response.status).toBe(400);
    expect(setAiUserLimitOverridesMock).not.toHaveBeenCalled();
  });

  it("rejects a negative profile limit override", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);

    const response = await PATCH(request({ profileGenerationLimit: -5 }), { params });

    expect(response.status).toBe(400);
    expect(setAiUserLimitOverridesMock).not.toHaveBeenCalled();
  });

  it("maps AdminUserError to its status code", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    setAiUserLimitOverridesMock.mockRejectedValue(new AdminUserError("NOT_FOUND", "User not found."));

    const response = await PATCH(request({ tokenLimit: 5000 }), { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "User not found.", details: { code: "NOT_FOUND" } });
  });

  it("returns 500 for unexpected errors", async () => {
    requireAdminMock.mockResolvedValue(ADMIN);
    setAiUserLimitOverridesMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PATCH(request({ tokenLimit: 5000 }), { params });

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
