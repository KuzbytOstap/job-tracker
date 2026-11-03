import { describe, expect, it } from "vitest";
import {
  APPLICATION_LIST_ITEM_SELECT,
  buildApplicationsWhere,
  toApplicationDTO,
  toApplicationListItemDTO,
  toApplicationListItemWithMeta,
  toApplicationWithMeta,
} from "@/lib/applications";

describe("buildApplicationsWhere", () => {
  it("scopes to the given userId with no search query", () => {
    expect(buildApplicationsWhere("", "user_1")).toEqual({ userId: "user_1" });
  });

  it("scopes to the given userId alongside the company/position search", () => {
    expect(buildApplicationsWhere("acme", "user_1")).toEqual({
      userId: "user_1",
      OR: [
        { company: { contains: "acme", mode: "insensitive" } },
        { position: { contains: "acme", mode: "insensitive" } },
      ],
    });
  });

  it("never omits userId, even for an empty query from a different user", () => {
    const whereA = buildApplicationsWhere("", "user_a");
    const whereB = buildApplicationsWhere("", "user_b");

    expect(whereA).not.toEqual(whereB);
    expect(whereA.userId).toBe("user_a");
    expect(whereB.userId).toBe("user_b");
  });
});

const FIT_ITEMS = [
  { criterion: "SALARY", verdict: "MISMATCH", vacancyValue: "3000 USD", yourValue: "4000 USD", reason: "Below the expectation." },
  { criterion: "WORK_FORMAT", verdict: "MATCH", vacancyValue: "Remote", yourValue: "Remote", reason: "Remote is preferred." },
  { criterion: "EMPLOYMENT_TYPE", verdict: "UNKNOWN", vacancyValue: null, yourValue: null, reason: "The vacancy is silent." },
  { criterion: "EXPERIENCE_YEARS", verdict: "MATCH", vacancyValue: "3+ years", yourValue: "5 years", reason: "3 asked, 5 in the CV." },
  { criterion: "TECHNOLOGIES", verdict: "MATCH", vacancyValue: "React", yourValue: "React", reason: "React is in the CV." },
];

function detailRow(overrides: Record<string, unknown> = {}) {
  const date = new Date("2026-11-01T10:00:00.000Z");
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
    jobPostingText: null,
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
    appliedAt: date,
    lastActivityAt: date,
    createdAt: date,
    updatedAt: date,
    statusChanges: [],
    ...overrides,
  } as unknown as Parameters<typeof toApplicationWithMeta>[0];
}

function toDTO(overrides: Record<string, unknown> = {}) {
  return toApplicationDTO(toApplicationWithMeta(detailRow(overrides), new Date("2026-11-02T10:00:00.000Z"), null));
}

describe("toApplicationDTO fit analysis", () => {
  it("maps a stored analysis into fitAnalysis in the fixed criterion order", () => {
    const dto = toDTO({
      fitAnalysis: { items: [...FIT_ITEMS].reverse(), analyzedAt: "2026-11-01T10:00:00.000Z" },
      fitAnalyzedAt: new Date("2026-11-01T10:00:00.000Z"),
      fitMismatchCount: 1,
    });

    expect(dto.fitAnalysis?.analyzedAt).toBe("2026-11-01T10:00:00.000Z");
    expect(dto.fitAnalysis?.items.map((item) => item.criterion)).toEqual([
      "SALARY",
      "WORK_FORMAT",
      "EMPLOYMENT_TYPE",
      "EXPERIENCE_YEARS",
      "TECHNOLOGIES",
    ]);
  });

  it("maps a missing or invalid stored analysis to null", () => {
    expect(toDTO().fitAnalysis).toBeNull();
    expect(toDTO({ fitAnalysis: { items: FIT_ITEMS.slice(0, 2), analyzedAt: "2026-11-01T10:00:00.000Z" } }).fitAnalysis).toBeNull();
    expect(toDTO({ fitAnalysis: "garbage" }).fitAnalysis).toBeNull();
  });

  it("keeps the internal fit columns and the owner out of the DTO", () => {
    const dto = toDTO({ fitAnalyzedAt: new Date("2026-11-01T10:00:00.000Z"), fitMismatchCount: 1 });

    expect(dto).not.toHaveProperty("userId");
    expect(dto).not.toHaveProperty("fitAnalyzedAt");
    expect(dto).not.toHaveProperty("fitMismatchCount");
  });
});

describe("application list item fit mismatch count", () => {
  it("selects only the light mismatch count column and never the stored analysis", () => {
    expect(APPLICATION_LIST_ITEM_SELECT).toHaveProperty("fitMismatchCount", true);
    expect(APPLICATION_LIST_ITEM_SELECT).not.toHaveProperty("fitAnalysis");
    expect(APPLICATION_LIST_ITEM_SELECT).not.toHaveProperty("fitAnalyzedAt");
  });

  it("carries the mismatch count, including null, into the list item DTO", () => {
    const row = {
      id: "app_1",
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
      fitMismatchCount: 2,
      appliedAt: new Date("2026-11-01T10:00:00.000Z"),
      lastActivityAt: new Date("2026-11-01T10:00:00.000Z"),
      updatedAt: new Date("2026-11-01T10:00:00.000Z"),
    } as unknown as Parameters<typeof toApplicationListItemWithMeta>[0];
    const now = new Date("2026-11-02T10:00:00.000Z");

    expect(toApplicationListItemDTO(toApplicationListItemWithMeta(row, now, null)).fitMismatchCount).toBe(2);
    expect(
      toApplicationListItemDTO(toApplicationListItemWithMeta({ ...row, fitMismatchCount: null }, now, null))
        .fitMismatchCount,
    ).toBeNull();
  });
});
