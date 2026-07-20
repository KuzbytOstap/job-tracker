import { beforeEach, describe, expect, it, vi } from "vitest";

const updateManyMock = vi.fn();
const updateMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
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
import { maybeGenerateHrQuestionsOnTransition } from "@/lib/hr-questions-service";

const EMPTY_CONTEXT = {
  company: "Acme",
  position: "Engineer",
  platform: "DIRECT",
  salaryExpectation: null,
  notes: null,
  jobPostingText: null,
  coverLetterText: null,
};

const MEANINGFUL_CONTEXT = {
  ...EMPTY_CONTEXT,
  jobPostingText: "We are hiring a React engineer with Node.js experience.",
};

beforeEach(() => {
  updateManyMock.mockReset();
  updateMock.mockReset();
  generateAdditionalQuestionsMock.mockReset();
  getHrQuestionsProviderMock.mockClear();
  updateManyMock.mockResolvedValue({ count: 1 });
  updateMock.mockResolvedValue({});
});

describe("maybeGenerateHrQuestionsOnTransition — trigger gating", () => {
  it("does nothing when the new status is not HR_CALL", async () => {
    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_REPLIED,
      existingHrInterviewQuestions: null,
      context: EMPTY_CONTEXT,
    });

    expect(result).toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
  });

  it("does nothing when moving from HR_CALL to another status", async () => {
    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.HR_CALL,
      newStatus: Status.TECH_INTERVIEW,
      existingHrInterviewQuestions: null,
      context: EMPTY_CONTEXT,
    });

    expect(result).toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("does nothing when already in HR_CALL and staying in HR_CALL", async () => {
    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.HR_CALL,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: EMPTY_CONTEXT,
    });

    expect(result).toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("does nothing when a question set already exists (return to HR_CALL)", async () => {
    const existing = { version: 1, questions: [{ text: "Tell me about yourself.", category: "CORE" }] };

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.TECH_INTERVIEW,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: existing,
      context: EMPTY_CONTEXT,
    });

    expect(result).toBeNull();
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
  });

  it("never throws when the atomic claim query itself fails, and reports no questions", async () => {
    updateManyMock.mockRejectedValue(new Error("connection reset"));

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    expect(result).toBeNull();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
  });

  it("does nothing when the atomic claim loses the race (concurrent transition)", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    expect(result).toBeNull();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
  });
});

describe("maybeGenerateHrQuestionsOnTransition — core questions and AI enhancement", () => {
  it("claims and persists the core question set on a genuine first transition", async () => {
    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: EMPTY_CONTEXT,
    });

    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
  });

  it("does not invoke the provider when there is no meaningful context", async () => {
    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: EMPTY_CONTEXT,
    });

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(result?.hrInterviewQuestions.questions.some((q) => q.category === "VACANCY_SPECIFIC")).toBe(
      false,
    );
  });

  it("does not treat whitespace-only context as meaningful", async () => {
    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: { ...EMPTY_CONTEXT, notes: "   \n  " },
    });

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("invokes the provider exactly once when meaningful context exists", async () => {
    generateAdditionalQuestionsMock.mockResolvedValue({ additionalQuestions: ["Custom question?"] });

    await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    expect(generateAdditionalQuestionsMock).toHaveBeenCalledTimes(1);
  });

  it("merges vacancy-specific questions on provider success and persists them", async () => {
    generateAdditionalQuestionsMock.mockResolvedValue({ additionalQuestions: ["Custom question?"] });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const vacancyQuestions = result?.hrInterviewQuestions.questions.filter(
      (q) => q.category === "VACANCY_SPECIFIC",
    );
    expect(vacancyQuestions).toEqual([{ text: "Custom question?", category: "VACANCY_SPECIFIC" }]);
  });

  it("keeps only core questions and returns success when the provider throws", async () => {
    generateAdditionalQuestionsMock.mockRejectedValue(new Error("boom"));

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("keeps only core questions when the provider returns zero questions", async () => {
    generateAdditionalQuestionsMock.mockResolvedValue({ additionalQuestions: [] });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("drops an AI-generated question that exceeds 140 characters, keeping valid ones", async () => {
    const tooLong = "a".repeat(141);
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: [tooLong, "Have you worked on B2B SaaS products?"],
    });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    const vacancyQuestions = result?.hrInterviewQuestions.questions.filter(
      (q) => q.category === "VACANCY_SPECIFIC",
    );
    expect(vacancyQuestions).toEqual([
      { text: "Have you worked on B2B SaaS products?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("accepts an AI-generated question exactly 140 characters long", async () => {
    const exactly140 = "a".repeat(140);
    generateAdditionalQuestionsMock.mockResolvedValue({ additionalQuestions: [exactly140] });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    const vacancyQuestions = result?.hrInterviewQuestions.questions.filter(
      (q) => q.category === "VACANCY_SPECIFIC",
    );
    expect(vacancyQuestions).toEqual([{ text: exactly140, category: "VACANCY_SPECIFIC" }]);
  });

  it("drops an AI-generated question that duplicates a core question", async () => {
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["Tell me about yourself.", "Have you worked on B2B SaaS products?"],
    });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    const vacancyQuestions = result?.hrInterviewQuestions.questions.filter(
      (q) => q.category === "VACANCY_SPECIFIC",
    );
    expect(vacancyQuestions).toEqual([
      { text: "Have you worked on B2B SaaS products?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("drops a duplicate among the AI-generated questions themselves", async () => {
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["Are you available immediately?", "are you available immediately?"],
    });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    const vacancyQuestions = result?.hrInterviewQuestions.questions.filter(
      (q) => q.category === "VACANCY_SPECIFIC",
    );
    expect(vacancyQuestions).toHaveLength(1);
  });

  it("never throws even when the configured provider is missing, and still returns core questions", async () => {
    getHrQuestionsProviderMock.mockImplementation(() => {
      throw new Error("AI_PROVIDER not configured");
    });

    const result = await maybeGenerateHrQuestionsOnTransition({
      applicationId: "app_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
      context: MEANINGFUL_CONTEXT,
    });

    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
  });
});
