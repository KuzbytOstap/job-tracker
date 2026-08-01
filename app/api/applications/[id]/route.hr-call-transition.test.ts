import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

const ensureCoreHrQuestionsForTransitionMock = vi.fn();
vi.mock("@/lib/hr-questions-service", () => ({
  ensureCoreHrQuestionsForTransition: (...args: unknown[]) =>
    ensureCoreHrQuestionsForTransitionMock(...args),
}));

import { prisma } from "@/lib/prisma";
import { PATCH } from "./route";

const params = Promise.resolve({ id: "app_1" });

const AUTHORIZED: SessionCheck = {
  status: "authorized",
  session: { user: { email: "me@example.com" }, expires: new Date().toISOString() },
};

function fakeRow(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-20T12:00:00.000Z");
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
    hrInterviewQuestions: null,
    hrQuestionsGeneratedAt: null,
    appliedAt: now,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
    statusChanges: [],
    ...overrides,
  };
}

function mockTransaction(
  existing: ReturnType<typeof fakeRow> | null,
  updatedOverrides: Record<string, unknown> = {},
) {
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: unknown) =>
    (callback as (tx: unknown) => unknown)({
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue(existing),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue(existing ? fakeRow({ ...existing, ...updatedOverrides }) : null),
      },
      statusChange: { create: vi.fn() },
    }),
  );
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/applications/app_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  checkSessionMock.mockReset();
  vi.mocked(prisma.$transaction).mockReset();
  ensureCoreHrQuestionsForTransitionMock.mockReset();
  ensureCoreHrQuestionsForTransitionMock.mockResolvedValue(null);
});

describe("PATCH /api/applications/[id] — HR Call question generation trigger", () => {
  it("invokes the HR question service on a genuine first transition into HR_CALL", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const existing = fakeRow({ status: "APPLIED" });
    mockTransaction(existing, { status: "HR_CALL" });

    const response = await PATCH(patchRequest({ status: "HR_CALL" }), { params });

    expect(response.status).toBe(200);
    expect(ensureCoreHrQuestionsForTransitionMock).toHaveBeenCalledTimes(1);
    expect(ensureCoreHrQuestionsForTransitionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: "app_1",
        previousStatus: "APPLIED",
        newStatus: "HR_CALL",
        existingHrInterviewQuestions: null,
      }),
    );
  });

  it("does not invoke the HR question service when the status field is unchanged", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const existing = fakeRow({ status: "APPLIED" });
    mockTransaction(existing, { notes: "Updated notes" });

    const response = await PATCH(patchRequest({ notes: "Updated notes" }), { params });

    expect(response.status).toBe(200);
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("does not invoke the HR question service when moving from HR_CALL to another status", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const existing = fakeRow({ status: "HR_CALL" });
    mockTransaction(existing, { status: "TECH_INTERVIEW" });

    const response = await PATCH(patchRequest({ status: "TECH_INTERVIEW" }), { params });

    expect(response.status).toBe(200);
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("does not invoke the HR question service for a non-status update", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const existing = fakeRow({ status: "HR_CALL" });
    mockTransaction(existing, { company: "New Co" });

    const response = await PATCH(patchRequest({ company: "New Co" }), { params });

    expect(response.status).toBe(200);
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("returns 401 before touching Prisma or the HR question service when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await PATCH(patchRequest({ status: "HR_CALL" }), { params });

    expect(response.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("returns 403 before touching Prisma or the HR question service when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await PATCH(patchRequest({ status: "HR_CALL" }), { params });

    expect(response.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("returns 400 and invokes no HR question service call for an invalid payload", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);

    const response = await PATCH(patchRequest({ status: "NOT_A_REAL_STATUS" }), { params });

    expect(response.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("invokes no HR question service call when the application does not exist", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    mockTransaction(null);

    const response = await PATCH(patchRequest({ status: "HR_CALL" }), { params });

    expect(response.status).toBe(404);
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("invokes no HR question service call when the Prisma update transaction fails", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("db exploded"));

    const response = await PATCH(patchRequest({ status: "HR_CALL" }), { params });

    expect(response.status).toBe(500);
    expect(ensureCoreHrQuestionsForTransitionMock).not.toHaveBeenCalled();
  });

  it("merges the core-only set returned by the core-questions service into the response DTO", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const existing = fakeRow({ status: "APPLIED" });
    mockTransaction(existing, { status: "HR_CALL" });

    const coreOnly = {
      version: 1,
      questions: [{ text: "Tell me about yourself.", category: "CORE" }],
    };
    ensureCoreHrQuestionsForTransitionMock.mockResolvedValue({
      hrInterviewQuestions: coreOnly,
      hrQuestionsGeneratedAt: new Date("2026-07-20T12:05:00.000Z"),
    });

    const response = await PATCH(patchRequest({ status: "HR_CALL" }), { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("HR_CALL");
    expect(body.hrInterviewQuestions).toEqual(coreOnly);
    expect(body.hrQuestionsGeneratedAt).toBe("2026-07-20T12:05:00.000Z");
  });

  it("merges an enriched question set and generation timestamp returned by the service into the DTO", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    const existing = fakeRow({ status: "APPLIED" });
    mockTransaction(existing, { status: "HR_CALL" });

    const merged = {
      version: 1,
      questions: [
        { text: "Tell me about yourself.", category: "CORE" },
        { text: "What is your Node.js experience?", category: "VACANCY_SPECIFIC" },
      ],
    };
    ensureCoreHrQuestionsForTransitionMock.mockResolvedValue({
      hrInterviewQuestions: merged,
      hrQuestionsGeneratedAt: new Date("2026-07-20T12:05:00.000Z"),
    });

    const response = await PATCH(patchRequest({ status: "HR_CALL" }), { params });
    const body = await response.json();

    expect(body.hrInterviewQuestions).toEqual(merged);
    expect(
      body.hrInterviewQuestions.questions.some((q: { category: string }) => q.category === "VACANCY_SPECIFIC"),
    ).toBe(true);
  });
});
