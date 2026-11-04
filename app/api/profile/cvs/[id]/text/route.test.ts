import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  setCvText: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/cv-service", () => ({
  setCvText: (...args: unknown[]) => mocks.setCvText(...args),
}));

import { PUT } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const params = Promise.resolve({ id: "cv_1" });

function putRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/profile/cvs/cv_1/text", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PUT /api/profile/cvs/[id]/text", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await PUT(putRequest({ text: "CV" }), { params })).status).toBe(401);
    expect(mocks.setCvText).not.toHaveBeenCalled();
  });

  it("returns 400 for blank, missing or oversized text", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await PUT(putRequest({ text: "   " }), { params })).status).toBe(400);
    expect((await PUT(putRequest({}), { params })).status).toBe(400);
    expect((await PUT(putRequest({ text: "a".repeat(100_001) }), { params })).status).toBe(400);
    expect(mocks.setCvText).not.toHaveBeenCalled();
  });

  it("stores the trimmed text for the signed in user's CV", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.setCvText.mockResolvedValue({ id: "cv_1", hasText: true });

    const response = await PUT(putRequest({ text: "  My CV text  " }), { params });

    expect(response.status).toBe(200);
    expect(mocks.setCvText).toHaveBeenCalledWith("test-user-id", "cv_1", "My CV text");
    expect(await response.json()).toEqual({ id: "cv_1", hasText: true });
  });

  it("returns 404 for another user's or a missing CV", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.setCvText.mockResolvedValue(null);

    expect((await PUT(putRequest({ text: "CV" }), { params })).status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.setCvText.mockRejectedValue(new Error("db down"));

    expect((await PUT(putRequest({ text: "CV" }), { params })).status).toBe(500);
  });
});
