import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";
import { AUTO_IGNORE_MAX_DAYS, AUTO_IGNORE_MIN_DAYS } from "@/lib/status";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const getMock = vi.fn();
const setMock = vi.fn();
vi.mock("@/lib/user-settings", () => ({
  getAutoIgnoreAfterDays: (...args: unknown[]) => getMock(...args),
  setAutoIgnoreAfterDays: (...args: unknown[]) => setMock(...args),
}));

import { GET, PATCH } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/settings/auto-ignore", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  checkSessionMock.mockReset();
  getMock.mockReset();
  setMock.mockReset();
});

describe("GET /api/settings/auto-ignore", () => {
  it("returns 401 when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    expect((await GET()).status).toBe(401);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("returns the current threshold including null", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getMock.mockResolvedValue(null);

    const response = await GET();

    expect(await response.json()).toEqual({ autoIgnoreAfterDays: null });
    expect(getMock).toHaveBeenCalledWith("test-user-id");
  });
});

describe("PATCH /api/settings/auto-ignore", () => {
  it("saves a valid number of days", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    setMock.mockResolvedValue(30);

    const response = await PATCH(patchRequest({ autoIgnoreAfterDays: 30 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ autoIgnoreAfterDays: 30 });
    expect(setMock).toHaveBeenCalledWith("test-user-id", 30);
  });

  it("allows null to disable auto-ignore", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    setMock.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ autoIgnoreAfterDays: null }));

    expect(response.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith("test-user-id", null);
  });

  it("rejects out of range, fractional and non numeric values", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);

    for (const value of [AUTO_IGNORE_MIN_DAYS - 1, AUTO_IGNORE_MAX_DAYS + 1, 7.5, "7"]) {
      expect((await PATCH(patchRequest({ autoIgnoreAfterDays: value }))).status, String(value)).toBe(400);
    }
    expect(setMock).not.toHaveBeenCalled();
  });

  it("accepts the boundary values", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    setMock.mockImplementation(async (_id: string, days: number | null) => days);

    expect((await PATCH(patchRequest({ autoIgnoreAfterDays: AUTO_IGNORE_MIN_DAYS }))).status).toBe(200);
    expect((await PATCH(patchRequest({ autoIgnoreAfterDays: AUTO_IGNORE_MAX_DAYS }))).status).toBe(200);
  });

  it("rejects malformed json", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);

    expect((await PATCH(patchRequest("{oops"))).status).toBe(400);
  });
});
