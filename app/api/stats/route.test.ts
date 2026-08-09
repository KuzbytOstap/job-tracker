import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const findManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

import { GET } from "./route";

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

beforeEach(() => {
  checkSessionMock.mockReset();
  findManyMock.mockReset();
});

describe("GET /api/stats", () => {
  it("returns 401 before touching Prisma when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns computed stats when authorized", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findManyMock.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ total: 0 });
  });

  it("scopes the query to the current user's id", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findManyMock.mockResolvedValue([]);

    await GET();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "test-user-id" } }),
    );
  });

  it("only counts the current user's applications, never another user's", async () => {
    // A correctly-scoped query only ever asks Prisma for rows matching the
    // session's userId, which is what keeps user B's applications out of
    // user A's statistics at the database level.
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findManyMock.mockResolvedValue([
      { status: "APPLIED", lastActivityAt: new Date(), statusChanges: [] },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(findManyMock.mock.calls[0][0].where).toEqual({ userId: "test-user-id" });
  });
});
