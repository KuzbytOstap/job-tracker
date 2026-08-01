import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const findUniqueMock = vi.fn();
const deleteMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/hr-questions-service", () => ({
  ensureCoreHrQuestionsForTransition: vi.fn().mockResolvedValue(null),
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
  deleteMock.mockReset();
  vi.mocked(prisma.$transaction).mockReset();
});

// Builds a tx double matching the concurrency-safe PATCH flow: it reads the
// current row (findUnique), applies a guarded conditional write (updateMany),
// records history (statusChange.create), then re-reads the fresh row.
function mockPatchTransaction(options: {
  existing: Record<string, unknown> | null;
  updateCount?: number;
  fresh?: Record<string, unknown>;
}) {
  const updateManyMock = vi.fn().mockResolvedValue({ count: options.updateCount ?? 1 });
  const statusChangeCreateMock = vi.fn();
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) =>
    (callback as (tx: unknown) => unknown)({
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue(options.existing),
        updateMany: updateManyMock,
        findUniqueOrThrow: vi.fn().mockResolvedValue(options.fresh ?? options.existing),
      },
      statusChange: { create: statusChangeCreateMock },
    }),
  );
  return { updateManyMock, statusChangeCreateMock };
}

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
    const { updateManyMock } = mockPatchTransaction({
      existing: fakeRow(),
      fresh: fakeRow({ jobPostingText: "Updated posting", coverLetterText: "Updated cover letter" }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingText: "Updated posting", coverLetterText: "Updated cover letter" }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith(
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
    const { updateManyMock } = mockPatchTransaction({
      existing: fakeRow({ jobPostingText: "Old posting", coverLetterText: "Old cover letter" }),
      fresh: fakeRow(),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingText: null, coverLetterText: null }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ jobPostingText: null, coverLetterText: null }),
      }),
    );
    const body = await response.json();
    expect(body.jobPostingText).toBeNull();
    expect(body.coverLetterText).toBeNull();
  });

  it("returns 409 when the optimistic-concurrency token does not match the stored row", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const { statusChangeCreateMock } = mockPatchTransaction({
      existing: fakeRow({ status: "APPLIED", updatedAt: new Date("2026-07-18T12:00:00.000Z") }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "HR_REPLIED",
        expectedUpdatedAt: "2026-07-18T09:00:00.000Z",
      }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(409);
    // A stale write must not create a StatusChange history entry.
    expect(statusChangeCreateMock).not.toHaveBeenCalled();
  });

  it("records a StatusChange with the fresh fromStatus read inside the transaction", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const existing = fakeRow({ status: "APPLIED" });
    const { statusChangeCreateMock } = mockPatchTransaction({
      existing,
      fresh: fakeRow({ status: "HR_REPLIED" }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "HR_REPLIED" }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(statusChangeCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStatus: "APPLIED", toStatus: "HR_REPLIED" }),
      }),
    );
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
