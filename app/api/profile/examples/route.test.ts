import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  listExamples: vi.fn(),
  createExample: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/examples-service", () => ({
  listExamples: (...args: unknown[]) => mocks.listExamples(...args),
  createExample: (...args: unknown[]) => mocks.createExample(...args),
}));

import { ProfileInputError } from "@/lib/profile/errors";
import { GET, POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const EXAMPLE = { id: "ex_1", vacancyText: "v", letterText: "l", createdAt: "2026-11-03T10:00:00.000Z" };

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/profile/examples", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/profile/examples", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await GET()).status).toBe(401);
    expect(mocks.listExamples).not.toHaveBeenCalled();
  });

  it("lists the signed in user's examples", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.listExamples.mockResolvedValue([EXAMPLE]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual([EXAMPLE]);
    expect(mocks.listExamples).toHaveBeenCalledWith("test-user-id");
  });
});

describe("POST /api/profile/examples", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await POST(postRequest({ vacancyText: "v", letterText: "l" }))).status).toBe(401);
    expect(mocks.createExample).not.toHaveBeenCalled();
  });

  it("returns 400 when a text is missing, blank or too long", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await POST(postRequest({ vacancyText: "v" }))).status).toBe(400);
    expect((await POST(postRequest({ vacancyText: "  ", letterText: "l" }))).status).toBe(400);
    expect((await POST(postRequest({ vacancyText: "v", letterText: "a".repeat(4001) }))).status).toBe(400);
    expect(mocks.createExample).not.toHaveBeenCalled();
  });

  it("creates the example for the signed in user and returns 201", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createExample.mockResolvedValue(EXAMPLE);

    const response = await POST(postRequest({ vacancyText: " v ", letterText: "l" }));

    expect(response.status).toBe(201);
    expect(mocks.createExample).toHaveBeenCalledWith("test-user-id", { vacancyText: "v", letterText: "l" });
    expect(await response.json()).toEqual(EXAMPLE);
  });

  it("returns 409 with the EXAMPLE_LIMIT code on the 4th example", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createExample.mockRejectedValue(new ProfileInputError("EXAMPLE_LIMIT"));

    const response = await POST(postRequest({ vacancyText: "v", letterText: "l" }));

    expect(response.status).toBe(409);
    expect((await response.json()).details).toEqual({ code: "EXAMPLE_LIMIT" });
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createExample.mockRejectedValue(new Error("db down"));

    expect((await POST(postRequest({ vacancyText: "v", letterText: "l" }))).status).toBe(500);
  });
});
