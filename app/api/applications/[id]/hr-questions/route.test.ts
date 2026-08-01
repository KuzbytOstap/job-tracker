import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SessionCheck } from "@/lib/auth";

const checkSessionMock = vi.fn<() => Promise<SessionCheck>>();
vi.mock("@/lib/auth", () => ({
  checkSession: () => checkSessionMock(),
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

const generateVacancySpecificHrQuestionsMock = vi.fn();
vi.mock("@/lib/hr-questions-service", () => ({
  generateVacancySpecificHrQuestions: (...args: unknown[]) =>
    generateVacancySpecificHrQuestionsMock(...args),
}));

import { POST } from "./route";

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
    status: "HR_CALL",
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: null,
    coverLetterText: null,
    hrInterviewQuestions: {
      version: 1,
      questions: [
        { text: "Tell me about yourself.", category: "CORE" },
        { text: "What is your Node.js experience?", category: "VACANCY_SPECIFIC" },
      ],
    },
    hrQuestionsGeneratedAt: now,
    appliedAt: now,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
    statusChanges: [],
    ...overrides,
  };
}

function postRequest() {
  return new NextRequest("http://localhost:3000/api/applications/app_1/hr-questions", {
    method: "POST",
  });
}

beforeEach(() => {
  checkSessionMock.mockReset();
  findUniqueMock.mockReset();
  generateVacancySpecificHrQuestionsMock.mockReset();
  generateVacancySpecificHrQuestionsMock.mockResolvedValue(null);
});

describe("POST /api/applications/[id]/hr-questions", () => {
  it("returns 401 before running generation when unauthenticated", async () => {
    checkSessionMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await POST(postRequest(), { params });

    expect(response.status).toBe(401);
    expect(generateVacancySpecificHrQuestionsMock).not.toHaveBeenCalled();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 before running generation when forbidden", async () => {
    checkSessionMock.mockResolvedValue({ status: "forbidden" });

    const response = await POST(postRequest(), { params });

    expect(response.status).toBe(403);
    expect(generateVacancySpecificHrQuestionsMock).not.toHaveBeenCalled();
  });

  it("runs generation and returns the full application DTO with the merged questions", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findUniqueMock.mockResolvedValue(fakeRow());

    const response = await POST(postRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(generateVacancySpecificHrQuestionsMock).toHaveBeenCalledWith("app_1");
    expect(
      body.hrInterviewQuestions.questions.some(
        (q: { category: string }) => q.category === "VACANCY_SPECIFIC",
      ),
    ).toBe(true);
  });

  it("returns 404 when the application no longer exists", async () => {
    checkSessionMock.mockResolvedValue(AUTHORIZED);
    findUniqueMock.mockResolvedValue(null);

    const response = await POST(postRequest(), { params });

    expect(response.status).toBe(404);
  });
});
