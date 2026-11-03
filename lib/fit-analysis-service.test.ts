import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  resolveCvText: vi.fn(),
  getProfile: vi.fn(),
  listContextItems: vi.fn(),
  runProfileOperation: vi.fn(),
  getAutoIgnoreAfterDays: vi.fn(),
  getUserLocale: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobApplication: {
      findFirst: (...args: unknown[]) => mocks.findFirst(...args),
      updateMany: (...args: unknown[]) => mocks.updateMany(...args),
      update: (...args: unknown[]) => mocks.update(...args),
    },
  },
}));

vi.mock("@/lib/profile/cv-service", () => ({
  resolveCvText: (...args: unknown[]) => mocks.resolveCvText(...args),
}));

vi.mock("@/lib/profile/profile-service", () => ({
  getProfile: (...args: unknown[]) => mocks.getProfile(...args),
}));

vi.mock("@/lib/profile/context-items-service", () => ({
  listContextItems: (...args: unknown[]) => mocks.listContextItems(...args),
}));

vi.mock("@/lib/profile/run-profile-ai", () => ({
  runProfileOperation: (...args: unknown[]) => mocks.runProfileOperation(...args),
}));

vi.mock("@/lib/user-settings", () => ({
  getAutoIgnoreAfterDays: (...args: unknown[]) => mocks.getAutoIgnoreAfterDays(...args),
  getUserLocale: (...args: unknown[]) => mocks.getUserLocale(...args),
}));

import { AiFeature } from "@/app/generated/prisma/client";
import {
  ApplicationNotFoundError,
  FitAnalysisStoreConflictError,
  analyzeApplicationFit,
} from "@/lib/fit-analysis-service";
import type { FitItemDTO } from "@/lib/api-types";

const UPDATED_AT = new Date("2026-11-01T10:00:00.000Z");
const LAST_ACTIVITY_AT = new Date("2026-10-30T09:00:00.000Z");

function fitItems(): FitItemDTO[] {
  return [
    { criterion: "TECHNOLOGIES", verdict: "MATCH", vacancyValue: "React", yourValue: "React", reason: "React is in the CV." },
    { criterion: "SALARY", verdict: "MISMATCH", vacancyValue: "3000 USD", yourValue: "4000 USD", reason: "Below the expectation." },
    { criterion: "WORK_FORMAT", verdict: "MATCH", vacancyValue: "Remote", yourValue: "Remote", reason: "Remote is preferred." },
    { criterion: "EMPLOYMENT_TYPE", verdict: "UNKNOWN", vacancyValue: null, yourValue: null, reason: "The vacancy is silent." },
    { criterion: "EXPERIENCE_YEARS", verdict: "MISMATCH", vacancyValue: "7+ years", yourValue: "5 years", reason: "7 asked, 5 in the CV." },
  ];
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    contactEmail: "ada@example.com",
    phone: "+380501112233",
    address: { street: "Main 1", postalCode: "79000", city: "Lviv", region: null, country: "UA" },
    salary: { amount: 4000, currency: "USD", period: "MONTH" },
    employmentTypes: ["FULL_TIME"],
    workFormats: ["REMOTE"],
    coverLetterPrompt: null,
    defaultCoverLetterPrompt: "default",
    ...overrides,
  };
}

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "app_1",
    userId: "user_1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    customPlatformId: null,
    customPlatform: null,
    reviewReasons: [],
    suggestedPlatformName: null,
    link: null,
    status: "APPLIED",
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: "Senior React engineer.",
    sourceUrls: [],
    coverLetterText: null,
    hrCallTranscript: null,
    hrInterviewQuestions: null,
    hrQuestionsGeneratedAt: null,
    hrEnhancementClaimedAt: null,
    hrEnhancementClaimToken: null,
    fitAnalysis: null,
    fitAnalyzedAt: null,
    fitMismatchCount: null,
    appliedAt: new Date("2026-10-30T09:00:00.000Z"),
    lastActivityAt: LAST_ACTIVITY_AT,
    createdAt: new Date("2026-10-30T09:00:00.000Z"),
    updatedAt: UPDATED_AT,
    statusChanges: [],
    ...overrides,
  };
}

type FindFirstArgs = { where: Record<string, unknown>; select?: Record<string, unknown>; include?: unknown };

let applicationRow: Record<string, unknown> | null;
let storedRow: Record<string, unknown> | null;

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  applicationRow = { company: "Acme", position: "Engineer", jobPostingText: "  Senior React engineer.  " };
  storedRow = detailRow();
  mocks.findFirst.mockImplementation(async (args: FindFirstArgs) => {
    if (args.include) return storedRow;
    if (args.select && "jobPostingText" in args.select) return applicationRow;
    return { updatedAt: UPDATED_AT, lastActivityAt: LAST_ACTIVITY_AT };
  });
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.resolveCvText.mockResolvedValue({ status: "ok", text: "CV text" });
  mocks.getProfile.mockResolvedValue(profile());
  mocks.listContextItems.mockResolvedValue([{ id: "c1", text: "Shipped passkeys" }]);
  mocks.runProfileOperation.mockResolvedValue({ ok: true, result: { items: fitItems() } });
  mocks.getAutoIgnoreAfterDays.mockResolvedValue(21);
  mocks.getUserLocale.mockResolvedValue("uk");
});

describe("analyzeApplicationFit ownership", () => {
  it("looks the application up through the owner and throws not found for a missing or foreign one", async () => {
    applicationRow = null;

    await expect(analyzeApplicationFit("user_1", "app_1")).rejects.toBeInstanceOf(ApplicationNotFoundError);

    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ id: "app_1", userId: "user_1" });
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("throws not found when the application disappears before the result is stored", async () => {
    mocks.findFirst.mockImplementation(async (args: FindFirstArgs) =>
      args.select && "jobPostingText" in args.select ? applicationRow : null,
    );

    await expect(analyzeApplicationFit("user_1", "app_1")).rejects.toBeInstanceOf(ApplicationNotFoundError);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});

describe("analyzeApplicationFit skips", () => {
  it("skips with NO_VACANCY_TEXT for a missing or blank vacancy text without calling AI", async () => {
    applicationRow = { company: "Acme", position: "Engineer", jobPostingText: null };
    expect(await analyzeApplicationFit("user_1", "app_1")).toEqual({ status: "skipped", reason: "NO_VACANCY_TEXT" });

    applicationRow = { company: "Acme", position: "Engineer", jobPostingText: "   " };
    expect(await analyzeApplicationFit("user_1", "app_1")).toEqual({ status: "skipped", reason: "NO_VACANCY_TEXT" });

    expect(mocks.resolveCvText).not.toHaveBeenCalled();
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("skips with NO_CV_TEXT when there is no primary CV text", async () => {
    mocks.resolveCvText.mockResolvedValue({ status: "missing", reason: "NO_CV_TEXT" });

    expect(await analyzeApplicationFit("user_1", "app_1")).toEqual({ status: "skipped", reason: "NO_CV_TEXT" });

    expect(mocks.resolveCvText).toHaveBeenCalledWith("user_1");
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("passes the operation skip reason through and stores nothing", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: false, reason: "FIT_ANALYSIS_LIMIT_REACHED" });

    expect(await analyzeApplicationFit("user_1", "app_1")).toEqual({
      status: "skipped",
      reason: "FIT_ANALYSIS_LIMIT_REACHED",
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("skips with PROVIDER_FAILED when the result does not hold every criterion exactly once", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: true, result: { items: fitItems().slice(0, 4) } });

    expect(await analyzeApplicationFit("user_1", "app_1")).toEqual({ status: "skipped", reason: "PROVIDER_FAILED" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});

describe("analyzeApplicationFit operation", () => {
  it("runs the analyzeFit operation under the FIT_ANALYSIS feature with the trimmed vacancy and profile data", async () => {
    await analyzeApplicationFit("user_1", "app_1");

    const params = mocks.runProfileOperation.mock.calls[0][0];
    expect(params.userId).toBe("user_1");
    expect(params.feature).toBe(AiFeature.FIT_ANALYSIS);
    expect(params.select({ analyzeFit: "fit-operation" })).toBe("fit-operation");
    expect(params.input).toEqual({
      vacancyText: "Senior React engineer.",
      cvText: "CV text",
      contextItems: ["Shipped passkeys"],
      searchPreferences: {
        salaryAmount: 4000,
        salaryCurrency: "USD",
        salaryPeriod: "MONTH",
        employmentTypes: ["FULL_TIME"],
        workFormats: ["REMOTE"],
      },
      company: "Acme",
      position: "Engineer",
      reasonLanguage: "uk",
    });
  });

  it("asks for explanations in the saved interface language and falls back to the vacancy language when none is saved", async () => {
    await analyzeApplicationFit("user_1", "app_1");
    expect(mocks.getUserLocale).toHaveBeenCalledWith("user_1");
    expect(mocks.runProfileOperation.mock.calls[0][0].input.reasonLanguage).toBe("uk");

    mocks.runProfileOperation.mockClear();
    mocks.getUserLocale.mockResolvedValue(null);
    await analyzeApplicationFit("user_1", "app_1");
    expect(mocks.runProfileOperation.mock.calls[0][0].input.reasonLanguage).toBeNull();
  });

  it("never sends the name, email, phone or address to the model", async () => {
    await analyzeApplicationFit("user_1", "app_1");

    const serialized = JSON.stringify(mocks.runProfileOperation.mock.calls[0][0].input);
    expect(serialized).not.toContain("Lovelace");
    expect(serialized).not.toContain("ada@example.com");
    expect(serialized).not.toContain("+380501112233");
    expect(serialized).not.toContain("Main 1");
  });
});

describe("analyzeApplicationFit storage", () => {
  it("stores the ordered analysis and the mismatch count while keeping updatedAt and lastActivityAt unchanged", async () => {
    await analyzeApplicationFit("user_1", "app_1");

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    const call = mocks.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "app_1", userId: "user_1", updatedAt: UPDATED_AT });
    expect(call.data.updatedAt).toBe(UPDATED_AT);
    expect(call.data.lastActivityAt).toBe(LAST_ACTIVITY_AT);
    expect(call.data.fitMismatchCount).toBe(2);
    expect(call.data.fitAnalyzedAt).toBeInstanceOf(Date);
    expect(call.data.fitAnalysis.analyzedAt).toBe(call.data.fitAnalyzedAt.toISOString());
    expect(call.data.fitAnalysis.items.map((item: FitItemDTO) => item.criterion)).toEqual([
      "SALARY",
      "WORK_FORMAT",
      "EMPLOYMENT_TYPE",
      "EXPERIENCE_YEARS",
      "TECHNOLOGIES",
    ]);
  });

  it("retries with the fresh timestamps when the application changed while it was being stored", async () => {
    const newerUpdatedAt = new Date("2026-11-02T10:00:00.000Z");
    let reads = 0;
    mocks.findFirst.mockImplementation(async (args: FindFirstArgs) => {
      if (args.include) return storedRow;
      if (args.select && "jobPostingText" in args.select) return applicationRow;
      reads += 1;
      return { updatedAt: reads === 1 ? UPDATED_AT : newerUpdatedAt, lastActivityAt: LAST_ACTIVITY_AT };
    });
    mocks.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    const outcome = await analyzeApplicationFit("user_1", "app_1");

    expect(outcome.status).toBe("ok");
    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
    expect(mocks.updateMany.mock.calls[1][0].where.updatedAt).toBe(newerUpdatedAt);
    expect(mocks.updateMany.mock.calls[1][0].data.updatedAt).toBe(newerUpdatedAt);
  });

  it("gives up with a store conflict after repeated concurrent changes", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(analyzeApplicationFit("user_1", "app_1")).rejects.toBeInstanceOf(FitAnalysisStoreConflictError);
    expect(mocks.updateMany).toHaveBeenCalledTimes(3);
  });

  it("returns the stored application as an ApplicationDTO with the parsed analysis", async () => {
    storedRow = detailRow({
      fitAnalysis: { items: fitItems(), analyzedAt: "2026-11-03T12:00:00.000Z" },
      fitAnalyzedAt: new Date("2026-11-03T12:00:00.000Z"),
      fitMismatchCount: 2,
    });

    const outcome = await analyzeApplicationFit("user_1", "app_1");

    if (outcome.status !== "ok") throw new Error("expected ok");
    expect(outcome.application.id).toBe("app_1");
    expect(outcome.application.updatedAt).toBe(UPDATED_AT.toISOString());
    expect(outcome.application.lastActivityAt).toBe(LAST_ACTIVITY_AT.toISOString());
    expect(outcome.application.fitAnalysis?.analyzedAt).toBe("2026-11-03T12:00:00.000Z");
    expect(outcome.application.fitAnalysis?.items[0].criterion).toBe("SALARY");
    expect(outcome.application).not.toHaveProperty("userId");
    expect(outcome.application).not.toHaveProperty("fitAnalyzedAt");
    expect(outcome.application).not.toHaveProperty("fitMismatchCount");
    expect(mocks.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "app_1", userId: "user_1" }, include: expect.anything() }),
    );
    expect(mocks.getAutoIgnoreAfterDays).toHaveBeenCalledWith("user_1");
  });
});
