import { describe, expect, it } from "vitest";
import {
  HR_CORE_QUESTIONS,
  buildHrInterviewQuestionSet,
  createCoreOnlyQuestionSet,
  hrInterviewQuestionSetSchema,
  normalizeAndDedupeQuestions,
  parseStoredHrInterviewQuestionSet,
} from "@/lib/hr-interview-questions";

describe("createCoreOnlyQuestionSet", () => {
  it("produces a valid question set matching the schema", () => {
    const set = createCoreOnlyQuestionSet();
    expect(hrInterviewQuestionSetSchema.safeParse(set).success).toBe(true);
  });

  it("includes every core question, all tagged CORE, in deterministic order", () => {
    const set = createCoreOnlyQuestionSet();
    expect(set.questions.map((q) => q.text)).toEqual([...HR_CORE_QUESTIONS]);
    expect(set.questions.every((q) => q.category === "CORE")).toBe(true);
  });

  it("is version 1", () => {
    expect(createCoreOnlyQuestionSet().version).toBe(1);
  });
});

describe("buildHrInterviewQuestionSet", () => {
  it("places core questions before vacancy-specific questions", () => {
    const set = buildHrInterviewQuestionSet(["A custom vacancy question?"]);
    const categories = set.questions.map((q) => q.category);
    const firstVacancyIndex = categories.indexOf("VACANCY_SPECIFIC");
    const lastCoreIndex = categories.lastIndexOf("CORE");
    expect(firstVacancyIndex).toBeGreaterThan(lastCoreIndex);
  });

  it("appends the given additional questions as VACANCY_SPECIFIC", () => {
    const set = buildHrInterviewQuestionSet(["What is your NestJS experience?"]);
    const vacancyQuestions = set.questions.filter((q) => q.category === "VACANCY_SPECIFIC");
    expect(vacancyQuestions).toEqual([
      { text: "What is your NestJS experience?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("returns only core questions when no additional questions are given", () => {
    const set = buildHrInterviewQuestionSet([]);
    expect(set.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(set.questions).toHaveLength(HR_CORE_QUESTIONS.length);
  });
});

describe("hrInterviewQuestionSetSchema", () => {
  it("rejects unknown properties on the set", () => {
    const result = hrInterviewQuestionSetSchema.safeParse({
      version: 1,
      questions: [],
      extra: "nope",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown properties on a question", () => {
    const result = hrInterviewQuestionSetSchema.safeParse({
      version: 1,
      questions: [{ text: "Hi?", category: "CORE", answer: "no" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a version other than 1", () => {
    const result = hrInterviewQuestionSetSchema.safeParse({ version: 2, questions: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty question string", () => {
    const result = hrInterviewQuestionSetSchema.safeParse({
      version: 1,
      questions: [{ text: "", category: "CORE" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a question longer than 300 characters", () => {
    const result = hrInterviewQuestionSetSchema.safeParse({
      version: 1,
      questions: [{ text: "a".repeat(301), category: "CORE" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a question exactly 300 characters long", () => {
    const result = hrInterviewQuestionSetSchema.safeParse({
      version: 1,
      questions: [{ text: "a".repeat(300), category: "CORE" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 25 total questions", () => {
    const questions = Array.from({ length: 26 }, (_, i) => ({
      text: `Question ${i}?`,
      category: "CORE" as const,
    }));
    const result = hrInterviewQuestionSetSchema.safeParse({ version: 1, questions });
    expect(result.success).toBe(false);
  });
});

describe("normalizeAndDedupeQuestions", () => {
  it("drops empty/whitespace-only questions", () => {
    const result = normalizeAndDedupeQuestions([
      { text: "  ", category: "CORE" },
      { text: "Real question?", category: "CORE" },
    ]);
    expect(result).toEqual([{ text: "Real question?", category: "CORE" }]);
  });

  it("drops questions longer than 300 characters", () => {
    const result = normalizeAndDedupeQuestions([
      { text: "a".repeat(301), category: "CORE" },
      { text: "Short question?", category: "CORE" },
    ]);
    expect(result).toEqual([{ text: "Short question?", category: "CORE" }]);
  });

  it("deduplicates case-insensitively", () => {
    const result = normalizeAndDedupeQuestions([
      { text: "Why do you want this role?", category: "CORE" },
      { text: "WHY DO YOU WANT THIS ROLE?", category: "VACANCY_SPECIFIC" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("CORE");
  });

  it("deduplicates ignoring trailing punctuation differences", () => {
    const result = normalizeAndDedupeQuestions([
      { text: "When can you start?", category: "CORE" },
      { text: "When can you start", category: "VACANCY_SPECIFIC" },
      { text: "When can you start...", category: "VACANCY_SPECIFIC" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("does not dedupe questions that differ beyond trailing punctuation", () => {
    const result = normalizeAndDedupeQuestions([
      { text: "What is your English level?", category: "CORE" },
      { text: "What is your Node.js level?", category: "VACANCY_SPECIFIC" },
    ]);
    expect(result).toHaveLength(2);
  });

  it("caps the result at 25 questions", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      text: `Unique question number ${i}?`,
      category: "CORE" as const,
    }));
    const result = normalizeAndDedupeQuestions(many);
    expect(result).toHaveLength(25);
  });
});

describe("parseStoredHrInterviewQuestionSet", () => {
  it("returns null for null", () => {
    expect(parseStoredHrInterviewQuestionSet(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseStoredHrInterviewQuestionSet(undefined)).toBeNull();
  });

  it("returns null for a malformed shape instead of throwing", () => {
    expect(() => parseStoredHrInterviewQuestionSet({ not: "a question set" })).not.toThrow();
    expect(parseStoredHrInterviewQuestionSet({ not: "a question set" })).toBeNull();
  });

  it("returns null for a raw string value instead of throwing", () => {
    expect(parseStoredHrInterviewQuestionSet("not json shaped data")).toBeNull();
  });

  it("returns null for an array instead of the expected object", () => {
    expect(parseStoredHrInterviewQuestionSet([])).toBeNull();
  });

  it("parses a valid stored question set", () => {
    const stored = createCoreOnlyQuestionSet();
    expect(parseStoredHrInterviewQuestionSet(stored)).toEqual(stored);
  });
});
