import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const findUniqueMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, PATCH, DELETE } from "./route";

const params = Promise.resolve({ id: "app_1" });

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { email: "me@example.com" }, expires: new Date().toISOString() },
};

function fakeRow(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-18T12:00:00.000Z");
  return {
    id: "app_1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    link: null,
    status: "APPLIED",
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: null,
    coverLetterText: null,
    appliedAt: now,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
    statusChanges: [],
    ...overrides,
  };
}

beforeEach(() => {
  checkSessionMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

describe("GET /api/applications/[id]", () => {
  it("returns 401 before touching Prisma when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1");

    const response = await GET(request, { params });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1");

    const response = await GET(request, { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/applications/[id]", () => {
  it("returns 401 before touching Prisma when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("updates both source text fields", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findUniqueMock.mockResolvedValue(fakeRow());
    const txUpdateMock = vi.fn();
    const txFindUniqueOrThrowMock = vi.fn().mockResolvedValue(
      fakeRow({ jobPostingText: "Updated posting", coverLetterText: "Updated cover letter" }),
    );
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) =>
      (callback as (tx: unknown) => unknown)({
        jobApplication: { update: txUpdateMock, findUniqueOrThrow: txFindUniqueOrThrowMock },
        statusChange: { create: vi.fn() },
      }),
    );

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingText: "Updated posting", coverLetterText: "Updated cover letter" }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(txUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobPostingText: "Updated posting",
          coverLetterText: "Updated cover letter",
        }),
      }),
    );
    const body = await response.json();
    expect(body.jobPostingText).toBe("Updated posting");
    expect(body.coverLetterText).toBe("Updated cover letter");
  });

  it("clears both source text fields to null", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findUniqueMock.mockResolvedValue(
      fakeRow({ jobPostingText: "Old posting", coverLetterText: "Old cover letter" }),
    );
    const txUpdateMock = vi.fn();
    const txFindUniqueOrThrowMock = vi.fn().mockResolvedValue(fakeRow());
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) =>
      (callback as (tx: unknown) => unknown)({
        jobApplication: { update: txUpdateMock, findUniqueOrThrow: txFindUniqueOrThrowMock },
        statusChange: { create: vi.fn() },
      }),
    );

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingText: null, coverLetterText: null }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(txUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jobPostingText: null, coverLetterText: null }),
      }),
    );
    const body = await response.json();
    expect(body.jobPostingText).toBeNull();
    expect(body.coverLetterText).toBeNull();
  });
});

describe("DELETE /api/applications/[id]", () => {
  it("returns 401 before touching Prisma when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
