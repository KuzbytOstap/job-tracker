import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  updateCvMeta: vi.fn(),
  deleteCv: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cv-service", () => ({
  updateCvMeta: (...args: unknown[]) => mocks.updateCvMeta(...args),
  deleteCv: (...args: unknown[]) => mocks.deleteCv(...args),
}));

import { DELETE, PATCH } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const params = Promise.resolve({ id: "cv_1" });

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/profile/cvs/cv_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest("http://localhost:3000/api/profile/cvs/cv_1", { method: "DELETE" });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PATCH /api/profile/cvs/[id]", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await PATCH(patchRequest({ label: "x" }), { params })).status).toBe(401);
    expect(mocks.updateCvMeta).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty body, a demotion, or unknown keys", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await PATCH(patchRequest({}), { params })).status).toBe(400);
    expect((await PATCH(patchRequest({ isPrimary: false }), { params })).status).toBe(400);
    expect((await PATCH(patchRequest({ fileData: "x" }), { params })).status).toBe(400);
    expect(mocks.updateCvMeta).not.toHaveBeenCalled();
  });

  it("updates the CV scoped to the signed in user", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateCvMeta.mockResolvedValue({ id: "cv_1", isPrimary: true });

    const response = await PATCH(patchRequest({ isPrimary: true, label: " Mobile " }), { params });

    expect(response.status).toBe(200);
    expect(mocks.updateCvMeta).toHaveBeenCalledWith("test-user-id", "cv_1", { isPrimary: true, label: "Mobile" });
  });

  it("returns 404 for another user's or a missing CV", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateCvMeta.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ label: "x" }), { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "CV not found" });
  });
});

describe("DELETE /api/profile/cvs/[id]", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await DELETE(deleteRequest(), { params })).status).toBe(401);
    expect(mocks.deleteCv).not.toHaveBeenCalled();
  });

  it("deletes the CV scoped to the signed in user and returns 204", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteCv.mockResolvedValue(true);

    const response = await DELETE(deleteRequest(), { params });

    expect(response.status).toBe(204);
    expect(mocks.deleteCv).toHaveBeenCalledWith("test-user-id", "cv_1");
  });

  it("returns 404 for another user's or a missing CV", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteCv.mockResolvedValue(false);

    expect((await DELETE(deleteRequest(), { params })).status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteCv.mockRejectedValue(new Error("db down"));

    expect((await DELETE(deleteRequest(), { params })).status).toBe(500);
  });
});
