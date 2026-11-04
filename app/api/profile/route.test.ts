import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/profile-service", () => ({
  getProfile: (...args: unknown[]) => mocks.getProfile(...args),
  updateProfile: (...args: unknown[]) => mocks.updateProfile(...args),
}));

import { GET, PATCH } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const PROFILE = { firstName: "Ada", defaultCoverLetterPrompt: "prompt" };

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/profile", { method: "PATCH", body: JSON.stringify(body) });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/profile", () => {
  it("returns 401 before reading anything when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.getProfile).not.toHaveBeenCalled();
  });

  it("returns 403 when forbidden", async () => {
    mocks.checkSession.mockResolvedValue({ status: "forbidden" });

    expect((await GET()).status).toBe(403);
    expect(mocks.getProfile).not.toHaveBeenCalled();
  });

  it("returns the signed in user's profile and forbids caching", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.getProfile.mockResolvedValue(PROFILE);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(PROFILE);
    expect(mocks.getProfile).toHaveBeenCalledWith("test-user-id");
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.getProfile.mockRejectedValue(new Error("db down"));

    expect((await GET()).status).toBe(500);
  });
});

describe("PATCH /api/profile", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await PATCH(patchRequest({ firstName: "Ada" }))).status).toBe(401);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("returns 400 for a body that is not JSON", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    const request = new NextRequest("http://localhost:3000/api/profile", { method: "PATCH", body: "{oops" });

    expect((await PATCH(request)).status).toBe(400);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("rejects unknown keys and invalid values", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await PATCH(patchRequest({ userId: "someone-else" }))).status).toBe(400);
    expect((await PATCH(patchRequest({ salary: { period: "WEEK" } }))).status).toBe(400);
    expect((await PATCH(patchRequest({ contactEmail: "nope" }))).status).toBe(400);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("updates the signed in user's profile with normalized values", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateProfile.mockResolvedValue(PROFILE);

    const response = await PATCH(patchRequest({ firstName: "  Ada ", phone: "", employmentTypes: ["FULL_TIME"] }));

    expect(response.status).toBe(200);
    expect(mocks.updateProfile).toHaveBeenCalledWith("test-user-id", {
      firstName: "Ada",
      phone: null,
      employmentTypes: ["FULL_TIME"],
    });
    expect(await response.json()).toEqual(PROFILE);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateProfile.mockRejectedValue(new Error("db down"));

    expect((await PATCH(patchRequest({ firstName: "Ada" }))).status).toBe(500);
  });
});
