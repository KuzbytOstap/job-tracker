import { beforeEach, describe, expect, it, vi } from "vitest";

const updateManyMock = vi.fn();
const findFirstMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

const generateAdditionalQuestionsMock = vi.fn();
const getHrQuestionsProviderMock = vi.fn<() => HrQuestionsProvider>(() => ({
  name: "mock",
  maxOutputTokens: 400,
  countInputTokens: vi.fn(),
  generateAdditionalQuestions: generateAdditionalQuestionsMock,
}));
vi.mock("@/lib/ai/get-hr-questions-provider", () => ({
  getHrQuestionsProvider: () => getHrQuestionsProviderMock(),
}));

const requireAiAccessApprovedMock = vi.fn();
const runGatedAiCallMock = vi.fn();
vi.mock("@/lib/ai/access-control", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/access-control")>("@/lib/ai/access-control");
  return {
    ...actual,
    requireAiAccessApproved: (...args: unknown[]) => requireAiAccessApprovedMock(...args),
    runGatedAiCall: (...args: unknown[]) => runGatedAiCallMock(...args),
  };
});

import { Status } from "@/app/generated/prisma/client";
import { AiAccessError } from "@/lib/ai/access-control";
import {
  ensureCoreHrQuestionsForTransition,
  generateVacancySpecificHrQuestions,
} from "@/lib/hr-questions-service";
import type { HrInterviewQuestion } from "@/lib/hr-interview-questions";
import type { HrQuestionsProvider } from "@/lib/ai/hr-questions-provider";

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
  findFirstMock.mockReset();
  generateAdditionalQuestionsMock.mockReset();
  getHrQuestionsProviderMock.mockClear();
  getHrQuestionsProviderMock.mockReturnValue({
    name: "mock",
    maxOutputTokens: 400,
    countInputTokens: vi.fn(),
    generateAdditionalQuestions: generateAdditionalQuestionsMock,
  });
  requireAiAccessApprovedMock.mockReset();
  requireAiAccessApprovedMock.mockResolvedValue(undefined);
  runGatedAiCallMock.mockReset();
  runGatedAiCallMock.mockImplementation(
    async ({ call }: { call: (reportUsage: (usage: unknown) => void) => Promise<unknown> }) => call(() => {}),
  );
  updateManyMock.mockResolvedValue({ count: 1 });
});

describe("ensureCoreHrQuestionsForTransition — gating and atomic claim", () => {
  it("does nothing when the new status is not HR_CALL", async () => {
    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      userId: "user_1",
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
      userId: "user_1",
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
      userId: "user_1",
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
      userId: "user_1",
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

  it("scopes the atomic claim by both applicationId and userId", async () => {
    await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      userId: "user_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
    });

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "app_1", userId: "user_1" }),
      }),
    );
  });

  it("never throws when the claim query fails, and reports no questions", async () => {
    updateManyMock.mockRejectedValue(new Error("connection reset"));

    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      userId: "user_1",
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
      userId: "user_1",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
    });

    expect(result).toBeNull();
  });

  it("returns null when the application belongs to another user (claim scoped by userId matches nothing)", async () => {
    // Simulates the claim where clause {id, userId} matching zero rows
    // because app_1 is owned by someone else — identical outcome to a
    // genuinely missing application.
    updateManyMock.mockResolvedValue({ count: 0 });

    const result = await ensureCoreHrQuestionsForTransition({
      applicationId: "app_1",
      userId: "someone-elses-id",
      previousStatus: Status.APPLIED,
      newStatus: Status.HR_CALL,
      existingHrInterviewQuestions: null,
    });

    expect(result).toBeNull();
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "app_1", userId: "someone-elses-id" }),
      }),
    );
  });
});

describe("generateVacancySpecificHrQuestions — best-effort AI enhancement", () => {
  it("returns null when the application does not exist", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(result).toBeNull();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
  });

  it("scopes the lookup by both applicationId and userId", async () => {
    findFirstMock.mockResolvedValue(fakeApplication());

    await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app_1", userId: "user_1" } }),
    );
  });

  it("returns null when the application belongs to another user (lookup scoped by userId matches nothing)", async () => {
    // Simulates the {id, userId} lookup matching zero rows because app_1 is
    // owned by someone else — identical outcome to a genuinely missing
    // application, and no AI call is made.
    findFirstMock.mockResolvedValue(null);

    const result = await generateVacancySpecificHrQuestions("app_1", "someone-elses-id");

    expect(result).toBeNull();
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("returns null when no core question set has been stored yet", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ hrInterviewQuestions: null }));

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

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
    findFirstMock.mockResolvedValue(
      fakeApplication({ hrInterviewQuestions: enhanced, jobPostingText: "React/Node role." }),
    );

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toHaveLength(1);
  });

  it("does not invoke the provider when there is no meaningful context", async () => {
    findFirstMock.mockResolvedValue(fakeApplication());

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toHaveLength(0);
  });

  it("does not treat whitespace-only context as meaningful", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ notes: "   \n  " }));

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("invokes the provider once and persists merged vacancy-specific questions on success", async () => {
    findFirstMock.mockResolvedValue(
      fakeApplication({ jobPostingText: "We need a React/Node.js engineer." }),
    );
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["What is your Node.js experience?"],
    });

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(generateAdditionalQuestionsMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledTimes(2);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app_1", userId: "user_1" } }),
    );
    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toEqual([
      { text: "What is your Node.js experience?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("gates the mock provider behind AI access approval even though it consumes no quota", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockResolvedValue({ additionalQuestions: [] });

    await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(requireAiAccessApprovedMock).toHaveBeenCalledWith("user_1");
    expect(runGatedAiCallMock).not.toHaveBeenCalled();
  });

  it("propagates AiAccessError instead of swallowing it, and releases the claim it holds", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    requireAiAccessApprovedMock.mockRejectedValue(
      new AiAccessError("AI_ACCESS_REQUIRED", "AI access has not been approved yet."),
    );

    await expect(generateVacancySpecificHrQuestions("app_1", "user_1")).rejects.toBeInstanceOf(AiAccessError);

    expect(generateAdditionalQuestionsMock).not.toHaveBeenCalled();
    expect(updateManyMock).toHaveBeenCalledTimes(2);
    const claimCall = updateManyMock.mock.calls[0][0];
    const releaseCall = updateManyMock.mock.calls[1][0];
    expect(releaseCall).toEqual({
      where: { id: "app_1", hrEnhancementClaimToken: claimCall.data.hrEnhancementClaimToken },
      data: { hrEnhancementClaimedAt: null, hrEnhancementClaimToken: null },
    });
  });

  it("routes a real provider through the quota-gated call instead of the direct access check", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    const realGenerateMock = vi.fn().mockResolvedValue({ additionalQuestions: [] });
    getHrQuestionsProviderMock.mockReturnValue({
      name: "openai",
      maxOutputTokens: 400,
      countInputTokens: vi.fn().mockResolvedValue(42),
      generateAdditionalQuestions: realGenerateMock,
    });

    await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(runGatedAiCallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        feature: "HR_GENERATION",
        applicationId: "app_1",
        maxOutputTokens: 400,
      }),
    );
    expect(requireAiAccessApprovedMock).not.toHaveBeenCalled();
  });

  it("passes a countInputTokens callback that delegates to the real provider's own exact token counter", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    const countInputTokensMock = vi.fn().mockResolvedValue(123);
    getHrQuestionsProviderMock.mockReturnValue({
      name: "openai",
      maxOutputTokens: 400,
      countInputTokens: countInputTokensMock,
      generateAdditionalQuestions: vi.fn().mockResolvedValue({ additionalQuestions: [] }),
    });

    await generateVacancySpecificHrQuestions("app_1", "user_1");

    const callArgs = runGatedAiCallMock.mock.calls[0][0];
    await expect(callArgs.countInputTokens()).resolves.toBe(123);
    expect(countInputTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({ company: "Acme", jobPostingText: "React role." }),
    );
  });

  it("keeps only the core set and releases the claim (using its own lease token) when the provider throws", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockRejectedValue(new Error("boom"));

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(updateManyMock).toHaveBeenCalledTimes(2);
    const claimCall = updateManyMock.mock.calls[0][0];
    const releaseCall = updateManyMock.mock.calls[1][0];
    expect(releaseCall).toEqual({
      where: { id: "app_1", hrEnhancementClaimToken: claimCall.data.hrEnhancementClaimToken },
      data: { hrEnhancementClaimedAt: null, hrEnhancementClaimToken: null },
    });
  });

  it("keeps only the core set when the provider returns zero questions, and does not release the claim", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockResolvedValue({ additionalQuestions: [] });

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toHaveLength(0);
    expect(updateManyMock).toHaveBeenCalledTimes(1);
  });

  it("drops an AI-generated question that exceeds 140 characters, keeping valid ones", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["a".repeat(141), "Have you worked on B2B SaaS products?"],
    });

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toEqual([
      { text: "Have you worked on B2B SaaS products?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("drops an AI-generated question that duplicates a core question", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    generateAdditionalQuestionsMock.mockResolvedValue({
      additionalQuestions: ["Tell me about yourself.", "Have you worked on B2B SaaS products?"],
    });

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(vacancyQuestions(result?.hrInterviewQuestions.questions)).toEqual([
      { text: "Have you worked on B2B SaaS products?", category: "VACANCY_SPECIFIC" },
    ]);
  });

  it("never throws when the configured provider is missing, releases the claim, and keeps the core set", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    getHrQuestionsProviderMock.mockImplementation(() => {
      throw new Error("AI_PROVIDER not configured");
    });

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(result).not.toBeNull();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
    expect(updateManyMock).toHaveBeenCalledTimes(2);
    const claimCall = updateManyMock.mock.calls[0][0];
    const releaseCall = updateManyMock.mock.calls[1][0];
    expect(releaseCall).toEqual({
      where: { id: "app_1", hrEnhancementClaimToken: claimCall.data.hrEnhancementClaimToken },
      data: { hrEnhancementClaimedAt: null, hrEnhancementClaimToken: null },
    });
  });

  it("returns the current set without calling the provider when a concurrent request already claimed the enhancement slot", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));
    updateManyMock.mockResolvedValue({ count: 0 });

    const result = await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "app_1",
          userId: "user_1",
          OR: [{ hrEnhancementClaimToken: null }, { hrEnhancementClaimedAt: { lt: expect.any(Date) } }],
        }),
      }),
    );
    expect(getHrQuestionsProviderMock).not.toHaveBeenCalled();
    expect(result?.hrInterviewQuestions.questions.every((q) => q.category === "CORE")).toBe(true);
  });

  it("scopes the enhancement claim by both applicationId and userId, and issues a fresh lease token", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));

    await generateVacancySpecificHrQuestions("app_1", "user_1");

    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "app_1", userId: "user_1" }),
        data: { hrEnhancementClaimedAt: expect.any(Date), hrEnhancementClaimToken: expect.any(String) },
      }),
    );
  });

  it("lets a fresh request recover a lease abandoned by a crashed holder (stale-claim OR clause)", async () => {
    findFirstMock.mockResolvedValue(fakeApplication({ jobPostingText: "React role." }));

    await generateVacancySpecificHrQuestions("app_1", "user_1");

    const claimCall = updateManyMock.mock.calls[0][0];
    const staleBranch = claimCall.where.OR.find((clause: Record<string, unknown>) =>
      Object.prototype.hasOwnProperty.call(clause, "hrEnhancementClaimedAt"),
    );
    expect(staleBranch.hrEnhancementClaimedAt.lt.getTime()).toBeLessThan(Date.now());
  });
});
