import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const getUserLocaleMock = vi.fn();
const setUserLocaleMock = vi.fn();
vi.mock("@/lib/user-settings", () => ({
  getUserLocale: (...args: unknown[]) => getUserLocaleMock(...args),
  setUserLocale: (...args: unknown[]) => setUserLocaleMock(...args),
}));

import { GET, PATCH } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/settings/locale", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  checkSessionMock.mockReset();
  getUserLocaleMock.mockReset();
  setUserLocaleMock.mockReset();
});

describe("GET /api/settings/locale", () => {
  it("rejects unauthenticated and forbidden sessions", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    expect((await GET()).status).toBe(401);

    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    expect((await GET()).status).toBe(403);
    expect(getUserLocaleMock).not.toHaveBeenCalled();
  });

  it("returns the stored locale", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getUserLocaleMock.mockResolvedValue("uk");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locale: "uk" });
    expect(getUserLocaleMock).toHaveBeenCalledWith("test-user-id");
  });

  it("returns 500 when the lookup fails", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getUserLocaleMock.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect((await GET()).status).toBe(500);
  });
});

describe("PATCH /api/settings/locale", () => {
  it("rejects unauthenticated requests before parsing the body", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    expect((await PATCH(patchRequest({ locale: "uk" }))).status).toBe(401);
    expect(setUserLocaleMock).not.toHaveBeenCalled();
  });

  it("rejects malformed json, unsupported locales and extra fields", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);

    expect((await PATCH(patchRequest("{oops"))).status).toBe(400);
    expect((await PATCH(patchRequest({ locale: "fr" }))).status).toBe(400);
    expect((await PATCH(patchRequest({ locale: "uk", extra: true }))).status).toBe(400);
    expect(setUserLocaleMock).not.toHaveBeenCalled();
  });

  it("saves the locale and sets the cookie", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    setUserLocaleMock.mockResolvedValue("uk");

    const response = await PATCH(patchRequest({ locale: "uk" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locale: "uk" });
    expect(setUserLocaleMock).toHaveBeenCalledWith("test-user-id", "uk");
    expect(response.cookies.get("locale")?.value).toBe("uk");
  });

  it("clears the cookie when the locale is reset to null", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    setUserLocaleMock.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ locale: null }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locale: null });
    expect(response.cookies.get("locale")?.value ?? "").toBe("");
  });
});
