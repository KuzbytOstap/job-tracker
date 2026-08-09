import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const findFirstMock = vi.fn();
const deleteManyMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
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
  session: { user: { id: "test-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
};

const OTHER_USER: SessionCheck = {
  status: "authorized",
  session: { user: { id: "other-user-id", email: "me@example.com" }, expires: new Date().toISOString() },
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
    userId: "test-user-id",
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
  findFirstMock.mockReset();
  deleteManyMock.mockReset();
  vi.mocked(prisma.$transaction).mockReset();
});

// Builds a tx double matching the concurrency-safe PATCH flow: it reads the
// current row (findFirst, scoped by id+userId), applies a guarded
// conditional write (updateMany), records history (statusChange.create),
// then re-reads the fresh row (findFirstOrThrow).
function mockPatchTransaction(options: {
  existing: Record<string, unknown> | null;
  updateCount?: number;
  fresh?: Record<string, unknown>;
}) {
  const findFirstTxMock = vi.fn().mockResolvedValue(options.existing);
  const updateManyMock = vi.fn().mockResolvedValue({ count: options.updateCount ?? 1 });
  const statusChangeCreateMock = vi.fn();
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) =>
    (callback as (tx: unknown) => unknown)({
      jobApplication: {
        findFirst: findFirstTxMock,
        updateMany: updateManyMock,
        findFirstOrThrow: vi.fn().mockResolvedValue(options.fresh ?? options.existing),
      },
      statusChange: { create: statusChangeCreateMock },
    }),
  );
  return { findFirstTxMock, updateManyMock, statusChangeCreateMock };
}

describe("GET /api/applications/[id]", () => {
  it("returns 401 before touching Prisma when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1");

    const response = await GET(request, { params });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1");

    const response = await GET(request, { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the lookup by id and the current user's id", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findFirstMock.mockResolvedValue(fakeRow());
    const request = new NextRequest("http://localhost:3000/api/applications/app_1");

    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app_1", userId: "test-user-id" } }),
    );
  });

  it("returns 404 — not a leak of existence — when the application belongs to another user", async () => {
    checkSessionMock.mockResolvedValue(OTHER_USER);
    // A query scoped to {id, userId: "other-user-id"} finds nothing, because
    // app_1 belongs to "test-user-id".
    findFirstMock.mockResolvedValue(null);
    const request = new NextRequest("http://localhost:3000/api/applications/app_1");

    const response = await GET(request, { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Application not found" });
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app_1", userId: "other-user-id" } }),
    );
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
    expect(prisma.$transaction).not.toHaveBeenCalled();
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
    expect(prisma.$transaction).not.toHaveBeenCalled();
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

  it("recomputes sourceUrls when jobPostingText is updated", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const { updateManyMock } = mockPatchTransaction({
      existing: fakeRow(),
      fresh: fakeRow({
        jobPostingText: "Apply at https://example.com/jobs/1.",
        sourceUrls: ["https://example.com/jobs/1"],
      }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingText: "Apply at https://example.com/jobs/1." }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceUrls: ["https://example.com/jobs/1"] }),
      }),
    );
    const body = await response.json();
    expect(body.sourceUrls).toEqual(["https://example.com/jobs/1"]);
  });

  it("clears sourceUrls when jobPostingText is cleared", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const { updateManyMock } = mockPatchTransaction({
      existing: fakeRow({
        jobPostingText: "Apply at https://example.com/jobs/1.",
        sourceUrls: ["https://example.com/jobs/1"],
      }),
      fresh: fakeRow({ jobPostingText: null, sourceUrls: [] }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingText: null }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sourceUrls: [] }) }),
    );
  });

  it("does not touch sourceUrls when jobPostingText is omitted from the update", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const { updateManyMock } = mockPatchTransaction({
      existing: fakeRow({
        jobPostingText: "Apply at https://example.com/jobs/1.",
        sourceUrls: ["https://example.com/jobs/1"],
      }),
      fresh: fakeRow({ hrCallTranscript: "Discussed comp" }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hrCallTranscript: "Discussed comp" }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    const updateCallData = updateManyMock.mock.calls[0][0].data;
    expect(updateCallData.sourceUrls).toBeUndefined();
  });

  it("sets and clears the HR call transcript", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const { updateManyMock } = mockPatchTransaction({
      existing: fakeRow(),
      fresh: fakeRow({ hrCallTranscript: "Discussed comp and start date" }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hrCallTranscript: "Discussed comp and start date" }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hrCallTranscript: "Discussed comp and start date" }),
      }),
    );
    const body = await response.json();
    expect(body.hrCallTranscript).toBe("Discussed comp and start date");
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

  it("scopes the transactional read and the guarded write by the current user's id", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const { findFirstTxMock, updateManyMock } = mockPatchTransaction({
      existing: fakeRow(),
      fresh: fakeRow({ company: "New Co" }),
    });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "New Co" }),
    });

    await PATCH(request, { params });

    expect(findFirstTxMock).toHaveBeenCalledWith({ where: { id: "app_1", userId: "test-user-id" } });
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "app_1", userId: "test-user-id" }) }),
    );
  });

  it("returns 404 — not a leak of existence — when the application belongs to another user", async () => {
    checkSessionMock.mockResolvedValue(OTHER_USER);
    // Scoped by {id, userId: "other-user-id"} — app_1 belongs to a different
    // user, so the transactional read finds nothing, identical to a
    // genuinely missing id.
    const { updateManyMock } = mockPatchTransaction({ existing: null });

    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "New Co" }),
    });

    const response = await PATCH(request, { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Application not found" });
    expect(updateManyMock).not.toHaveBeenCalled();
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
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("deletes the row when it is scoped to id and the current user's id", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    deleteManyMock.mockResolvedValue({ count: 1 });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "app_1", userId: "test-user-id" } });
  });

  it("returns 404 — not a leak of existence — when the application belongs to another user", async () => {
    checkSessionMock.mockResolvedValue(OTHER_USER);
    // deleteMany scoped to {id, userId: "other-user-id"} deletes zero rows,
    // because app_1 belongs to a different user — identical response to a
    // genuinely missing id, and nothing is deleted.
    deleteManyMock.mockResolvedValue({ count: 0 });
    const request = new NextRequest("http://localhost:3000/api/applications/app_1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Application not found" });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "app_1", userId: "other-user-id" } });
  });
});
