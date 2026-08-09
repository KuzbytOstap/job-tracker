import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const getAiAccessStatusMock = vi.fn();
vi.mock("@/lib/ai/access-requests", () => ({
  getAiAccessStatus: (...args: unknown[]) => getAiAccessStatusMock(...args),
}));

import { AiAccessStatus } from "@/app/generated/prisma/client";
import { GET } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

beforeEach(() => {
  checkSessionMock.mockReset();
  getAiAccessStatusMock.mockReset();
});

describe("GET /api/ai-access", () => {
  it("returns 401 when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getAiAccessStatusMock).not.toHaveBeenCalled();
  });

  it("returns 403 when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(getAiAccessStatusMock).not.toHaveBeenCalled();
  });

  it("returns the current user's AI access status", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getAiAccessStatusMock.mockResolvedValue(AiAccessStatus.PENDING);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "PENDING" });
    expect(getAiAccessStatusMock).toHaveBeenCalledWith("test-user-id");
  });

  it("returns 500 when the status lookup throws", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    getAiAccessStatusMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(500);
    consoleErrorSpy.mockRestore();
  });
});
