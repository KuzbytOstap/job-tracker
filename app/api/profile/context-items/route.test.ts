import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  checkSession: vi.fn(),
  listContextItems: vi.fn(),
  createContextItem: vi.fn(),
  scoreAfterSave: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ checkSession: () => mocks.checkSession() }));
vi.mock("@/lib/profile/context-items-service", () => ({
  listContextItems: (...args: unknown[]) => mocks.listContextItems(...args),
  createContextItem: (...args: unknown[]) => mocks.createContextItem(...args),
}));
vi.mock("@/lib/profile/context-save", () => ({
  scoreAfterSave: (...args: unknown[]) => mocks.scoreAfterSave(...args),
}));

import { GET, POST } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const ITEM = { id: "item_1", text: "Shipped passkeys", weight: null, impact: null };
const SAVED = { item: { ...ITEM, weight: "SUBSTANTIAL", impact: 4 }, scoring: { scored: 1, remaining: 0, skipped: null } };

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/profile/context-items", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/profile/context-items", () => {
  it("returns 401 before touching the service when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await GET()).status).toBe(401);
    expect(mocks.listContextItems).not.toHaveBeenCalled();
  });

  it("lists the signed in user's items", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.listContextItems.mockResolvedValue([ITEM]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([ITEM]);
    expect(mocks.listContextItems).toHaveBeenCalledWith("test-user-id");
  });
});

describe("POST /api/profile/context-items", () => {
  it("returns 401 before creating anything when unauthenticated", async () => {
    mocks.checkSession.mockResolvedValue({ status: "unauthenticated" });

    expect((await POST(postRequest({ text: "x" }))).status).toBe(401);
    expect(mocks.createContextItem).not.toHaveBeenCalled();
  });

  it("returns 400 for blank, oversized or unexpected input", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);

    expect((await POST(postRequest({ text: "   " }))).status).toBe(400);
    expect((await POST(postRequest({ text: "a".repeat(1001) }))).status).toBe(400);
    expect((await POST(postRequest({ text: "ok", weight: "SUBSTANTIAL" }))).status).toBe(400);
    expect(mocks.createContextItem).not.toHaveBeenCalled();
  });

  it("creates the item for the signed in user, scores it and returns 201 with the result", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createContextItem.mockResolvedValue(ITEM);
    mocks.scoreAfterSave.mockResolvedValue(SAVED);

    const response = await POST(postRequest({ text: "  Shipped passkeys  " }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(SAVED);
    expect(mocks.createContextItem).toHaveBeenCalledWith("test-user-id", { text: "Shipped passkeys" });
    expect(mocks.scoreAfterSave).toHaveBeenCalledWith("test-user-id", "item_1");
  });

  it("still returns 201 with the saved item when scoring was skipped for quota", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createContextItem.mockResolvedValue(ITEM);
    mocks.scoreAfterSave.mockResolvedValue({
      item: ITEM,
      scoring: { scored: 0, remaining: 1, skipped: "PROFILE_LIMIT_REACHED" },
    });

    const response = await POST(postRequest({ text: "Shipped passkeys" }));

    expect(response.status).toBe(201);
    expect((await response.json()).scoring.skipped).toBe("PROFILE_LIMIT_REACHED");
  });

  it("returns 404 if the item vanished before it could be returned", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createContextItem.mockResolvedValue(ITEM);
    mocks.scoreAfterSave.mockResolvedValue(null);

    expect((await POST(postRequest({ text: "x" }))).status).toBe(404);
  });

  it("returns 500 for unexpected errors", async () => {
    mocks.checkSession.mockResolvedValue(AUTHORIZED);
    mocks.createContextItem.mockRejectedValue(new Error("db down"));

    expect((await POST(postRequest({ text: "x" }))).status).toBe(500);
  });
});
