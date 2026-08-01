import { beforeEach, describe, expect, it, vi } from "vitest";

const updateManyMock = vi.fn();
const updateMock = vi.fn();
const findUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

const generateAdditionalQuestionsMock = vi.fn();
const getHrQuestionsProviderMock = vi.fn(() => ({
  name: "mock",
  generateAdditionalQuestions: generateAdditionalQuestionsMock,
}));
vi.mock("@/lib/ai/get-hr-questions-provider", () => ({
  getHrQuestionsProvider: () => getHrQuestionsProviderMock(),
}));

import { Status } from "@/app/generated/prisma/client";
import {
  ensureCoreHrQuestionsForTransition,
  generateVacancySpecificHrQuestions,
} from "@/lib/hr-questions-service";
import type { HrInterviewQuestion } from "@/lib/hr-interview-questions";

const CORE_ONLY_SET = {
  version: 1 as const,
  questions: [{ text: "Tell me about yourself.", category: "CORE" as const }],
};

function fakeApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: "app_1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    salaryExpectation: null,
    notes: null,
    jobPostingText: null,
    coverLetterText: null,
    hrInterviewQuestions: CORE_ONLY_SET,
    hrQuestionsGeneratedAt: new Date("2026-07-20T12:00:00.000Z"),
    ...overrides,
  };
}

function vacancyQuestions(questions: HrInterviewQuestion[] | undefined) {
  return (questions ?? []).filter((q) => q.category === "VACANCY_SPECIFIC");
}

beforeEach(() => {
  updateManyMock.mockReset();
  updateMock.mockReset();
  findUniqueMock.mockReset();
  generateAdditionalQuestionsMock.mockReset();
  getHrQuestionsProviderMock.mockClear();
  updateManyMock.mockResolvedValue({ count: 1 });
  updateMock.mockResolvedValue({});
});

describe("ensureCoreHrQuestionsForTransition — gating and atomic claim", () => {
  it("does nothing when the new status is not HR_CALL", async () => {
    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_REPLIED,
      existingHrInterviewQuestions: null,
    });

    expect(result).toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("does nothing when moving from HR_CALL to another status", async () => {
    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      previousStatus: Status.HR_CALL,
      newStatus: Status.TECH_INTERVIEW,
      existingHrInterviewQuestions: null,
    });

    expect(result).toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("does nothing when a question set already exists (return to HR_CALL)", async () => {
    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      previousStatus: Status.TECH_INTERVIEW,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: CORE_ONLY_SET,
    });

    expect(result).toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("claims and returns the deterministic core set on a genuine first transition, without any AI call", async () => {
    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
    });

    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(generateAdditionalQuestionsMock).not.toHaveBeenCalled();
  });

  it("never throws when the claim query fails, and reports no questions", async () => {
    updateManyMock.mockRejectedValue(new Error("connection reset"));

    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
    });

    expect(result).toBeNull();
  });

  it("returns null when the atomic claim loses the race (concurrent transition)", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
    });

    expect(result).toBeNull();
  });
});

describe("generateVacancySpecificHrQuestions — best-effort AI enhancement", () => {
  it("returns null when the application does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(result).toBeNull();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
  });

  it("returns null when no core question set has been stored yet", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication({ hrInterviewQuestions: null }));

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(result).toBeNull();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
  });

  it("is idempotent: a set that already has vacancy-specific questions is returned unchanged with no AI call", async () => {
    const enhanced = {
      version: 1,
      questions: [
        { text: "Tell me about yourself.", category: "CORE" },
        { text: "What is your Node.js experience?", category: "VACANCY_SPECIFIC" },
      ],
    };
    findUniqueMock.mockResolvedValue(
      fakeApplication({ hrInterviewQuestions: enhanced, jobPostingText: "React/Node role." }),
    );

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toHaveLength(1);
  });

  it("does not invoke the provider when there is no meaningful context", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication());

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toHaveLength(0);
  });

  it("does not treat whitespace-only context as meaningful", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication({ notes: "   \n  " }));

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("invokes the provider once and persists merged vacancy-specific questions on success", async () => {
    findUniqueMock.mockResolvedValue(
      fakeApplication({ jobPostingText: "We need a React/Node.js engineer." }),
    );
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["What is your Node.js experience?"],
    });

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(generateAdditionalQuestionsMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toEqual([
      { text: "What is your Node.js experience?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("keeps only the core set and does not persist when the provider throws", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockRejectedValue(new Error("boom"));

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("keeps only the core set when the provider returns zero questions", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockResolvedValue({ additionalQuestions: [] });

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toHaveLength(0);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("drops an AI-generated question that exceeds 140 characters, keeping valid ones", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["a".repeat(141), "Have you worked on B2B SaaS products?"],
    });

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toEqual([
      { text: "Have you worked on B2B SaaS products?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("drops an AI-generated question that duplicates a core question", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["Tell me about yourself.", "Have you worked on B2B SaaS products?"],
    });

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toEqual([
      { text: "Have you worked on B2B SaaS products?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("never throws when the configured provider is missing, and keeps the core set", async () => {
    findUniqueMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    getHrQuestionsProviderMock.mockImplementation(() => {
      throw new Error("AI_PROVIDER not configured");
    });

    const result = await generateVacancySpecificHrQuestions("app_1");

    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
