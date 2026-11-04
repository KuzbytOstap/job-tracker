import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  updateContextItem: vi.fn(),
  deleteContextItem: vi.fn(),
  scoreAfterSave: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/context-items-service", () => ({
  updateContextItem: (...args: unknown[]) => mocks.updateContextItem(...args),
  deleteContextItem: (...args: unknown[]) => mocks.deleteContextItem(...args),
}));
vi.mock("@/lib/profile/context-save", () => ({
  scoreAfterSave: (...args: unknown[]) => mocks.scoreAfterSave(...args),
}));

import { DELETE, PATCH } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const params = Promise.resolve({ id: "item_1" });
const SAVED = {
  item: { id: "item_1", text: "New text", weight: null, impact: null },
  scoring: { scored: 0, remaining: 1, skipped: "NO_CV_TEXT" },
};

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/profile/context-items/item_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest("http://localhost:3000/api/profile/context-items/item_1", { method: "DELETE" });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PATCH /api/profile/context-items/[id]", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await PATCH(patchRequest({ text: "x" }), { params })).status).toBe(401);
    expect(mocks.updateContextItem).not.toHaveBeenCalled();
  });

  it("returns 400 for blank or oversized text", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await PATCH(patchRequest({ text: "  " }), { params })).status).toBe(400);
    expect((await PATCH(patchRequest({ text: "a".repeat(1001) }), { params })).status).toBe(400);
    expect(mocks.updateContextItem).not.toHaveBeenCalled();
  });

  it("updates the item scoped to the signed in user, then rescoring runs", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateContextItem.mockResolvedValue({ id: "item_1" });
    mocks.scoreAfterSave.mockResolvedValue(SAVED);

    const response = await PATCH(patchRequest({ text: " New text " }), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(SAVED);
    expect(mocks.updateContextItem).toHaveBeenCalledWith("test-user-id", "item_1", { text: "New text" });
    expect(mocks.scoreAfterSave).toHaveBeenCalledWith("test-user-id", "item_1");
  });

  it("returns 404 for another user's item without starting any scoring", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.updateContextItem.mockResolvedValue(null);

    const response = await PATCH(patchRequest({ text: "x" }), { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Item not found" });
    expect(mocks.scoreAfterSave).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/profile/context-items/[id]", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await DELETE(deleteRequest(), { params })).status).toBe(401);
    expect(mocks.deleteContextItem).not.toHaveBeenCalled();
  });

  it("deletes the item scoped to the signed in user and returns 204", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteContextItem.mockResolvedValue(true);

    const response = await DELETE(deleteRequest(), { params });

    expect(response.status).toBe(204);
    expect(mocks.deleteContextItem).toHaveBeenCalledWith("test-user-id", "item_1");
  });

  it("returns 404 for another user's item", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteContextItem.mockResolvedValue(false);

    expect((await DELETE(deleteRequest(), { params })).status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.deleteContextItem.mockRejectedValue(new Error("db down"));

    expect((await DELETE(deleteRequest(), { params })).status).toBe(500);
  });
});
