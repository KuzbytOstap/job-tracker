import { describe, expect, it } from "vitest";
import { MockHrQuestionsProvider } from "@/lib/ai/providers/mock-hr-questions-provider";
import { HR_CORE_QUESTIONS } from "@/lib/hr-interview-questions";

const BASE_INPUT = {
  company: "Acme Robotics",
  position: "Senior Frontend Engineer",
  platform: "OTHER",
  salaryExpectation: null,
  notes: null,
  jobPostingText: "We need a React/TypeScript engineer for our design system team.",
  coverLetterText: null,
};

describe("MockHrQuestionsProvider", () => {
  it("returns a small, stable set of vacancy-specific questions for meaningful context", async () => {
    const provider = new MockHrQuestionsProvider();
    const result = await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(result.additionalQuestions.length).toBeGreaterThan(0);
    expect(result.additionalQuestions.length).toBeLessThanOrEqual(6);
  });

  it("produces the exact same output for repeated identical input", async () => {
    const provider = new MockHrQuestionsProvider();
    const first = await provider.generateAdditionalQuestions(BASE_INPUT);
    const second = await provider.generateAdditionalQuestions(BASE_INPUT);

    expect(first).toEqual(second);
  });

  it("never duplicates a core question", async () => {
    const provider = new MockHrQuestionsProvider();
    const result = await provider.generateAdditionalQuestions(BASE_INPUT);

    const coreTextsLower = HR_CORE_QUESTIONS.map((q) => q.toLowerCase());
    for (const question of result.additionalQuestions) {
      expect(coreTextsLower).not.toContain(question.toLowerCase());
    }
  });

  it("throws when the deterministic error marker is present in the job posting", async () => {
    const provider = new MockHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions({
        ...BASE_INPUT,
        jobPostingText: "Some posting [mock:hr-error]",
      }),
    ).rejects.toThrow();
  });

  it("throws when the deterministic error marker is present in notes", async () => {
    const provider = new MockHrQuestionsProvider();

    await expect(
      provider.generateAdditionalQuestions({
        ...BASE_INPUT,
        jobPostingText: null,
        notes: "[mock:hr-error]",
      }),
    ).rejects.toThrow();
  });
});
