import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  updateExample: vi.fn(),
  deleteExample: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/examples-service", () => ({
  updateExample: (...args: unknown[]) => mocks.updateExample(...args),
  deleteExample: (...args: unknown[]) => mocks.deleteExample(...args),
}));

import { DELETE, PATCH } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const params = Promise.resolve({ id: "ex_1" });
const EXAMPLE = { id: "ex_1", vacancyText: "v", letterText: "new", createdAt: "2026-11-03T10:00:00.000Z" };

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/profile/examples/ex_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest("http://localhost:3000/api/profile/examples/ex_1", { method: "DELETE" });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PATCH /api/profile/examples/[id]", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await PATCH(patchRequest({ letterText: "new" }), { params })).status).toBe(401);
    expect(mocks.updateExample).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty or invalid body", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await PATCH(patchRequest({}), { params })).status).toBe(400);
    expect((await PATCH(patchRequest({ letterText: "a".repeat(4001) }), { params })).status).toBe(400);
    expect(mocks.updateExample).not.toHaveBeenCalled();
  });

  it("updates the example scoped to the signed in user", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateExample.mockResolvedValue(EXAMPLE);

    const response = await PATCH(patchRequest({ letterText: "new" }), { params });

    expect(response.status).toBe(200);
    expect(mocks.updateExample).toHaveBeenCalledWith("test-user-id", "ex_1", { letterText: "new" });
    expect(await response.json()).toEqual(EXAMPLE);
  });

  it("returns 404 for another user's or a missing example", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateExample.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ letterText: "new" }), { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Example not found" });
  });
});

describe("DELETE /api/profile/examples/[id]", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await DELETE(deleteRequest(), { params })).status).toBe(401);
    expect(mocks.deleteExample).not.toHaveBeenCalled();
  });

  it("deletes the example scoped to the signed in user and returns 204", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteExample.mockResolvedValue(true);

    const response = await DELETE(deleteRequest(), { params });

    expect(response.status).toBe(204);
    expect(mocks.deleteExample).toHaveBeenCalledWith("test-user-id", "ex_1");
  });

  it("returns 404 for another user's or a missing example", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteExample.mockResolvedValue(false);

    expect((await DELETE(deleteRequest(), { params })).status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteExample.mockRejectedValue(new Error("db down"));

    expect((await DELETE(deleteRequest(), { params })).status).toBe(500);
  });
});
