import { describe, expect, it } from "vitest";
import {
  FIT_CRITERIA,
  countFitMismatches,
  fitMismatchCountOf,
  fitItemsSchema,
  normalizeFitResult,
  parseStoredFitAnalysis,
} from "@/lib/fit-analysis";
import type { FitItemDTO } from "@/lib/api-types";

function items(): FitItemDTO[] {
  return [
    { criterion: "SALARY", verdict: "MISMATCH", vacancyValue: "3000 USD", yourValue: "4000 USD", reason: "Below the expectation." },
    { criterion: "WORK_FORMAT", verdict: "MATCH", vacancyValue: "Remote", yourValue: "Remote", reason: "Remote is preferred." },
    { criterion: "EMPLOYMENT_TYPE", verdict: "UNKNOWN", vacancyValue: null, yourValue: null, reason: "The vacancy is silent." },
    { criterion: "EXPERIENCE_YEARS", verdict: "MISMATCH", vacancyValue: "7+ years", yourValue: "5 years", reason: "7 asked, 5 in the CV." },
    { criterion: "TECHNOLOGIES", verdict: "MATCH", vacancyValue: "React", yourValue: "React", reason: "React is in the CV." },
  ];
}

const ANALYZED_AT = "2026-11-03T12:00:00.000Z";

describe("FIT_CRITERIA", () => {
  it("keeps the fixed criterion order", () => {
    expect(FIT_CRITERIA).toEqual(["SALARY", "WORK_FORMAT", "EMPLOYMENT_TYPE", "EXPERIENCE_YEARS", "TECHNOLOGIES"]);
  });
});

describe("fitItemsSchema", () => {
  it("accepts exactly five items with every criterion once", () => {
    expect(fitItemsSchema.safeParse(items()).success).toBe(true);
  });

  it("rejects four items, six items and a repeated criterion", () => {
    expect(fitItemsSchema.safeParse(items().slice(0, 4)).success).toBe(false);
    expect(fitItemsSchema.safeParse([...items(), items()[0]]).success).toBe(false);
    const repeated = items();
    repeated[1] = { ...repeated[1], criterion: "SALARY" };
    expect(fitItemsSchema.safeParse(repeated).success).toBe(false);
  });

  it("limits the reason to 300 characters and the values to 200 characters", () => {
    const withReason = (reason: string) => items().map((item, index) => (index === 0 ? { ...item, reason } : item));
    expect(fitItemsSchema.safeParse(withReason("r".repeat(300))).success).toBe(true);
    expect(fitItemsSchema.safeParse(withReason("r".repeat(301))).success).toBe(false);
    expect(fitItemsSchema.safeParse(withReason("   ")).success).toBe(false);

    const withValue = (vacancyValue: string) =>
      items().map((item, index) => (index === 0 ? { ...item, vacancyValue } : item));
    expect(fitItemsSchema.safeParse(withValue("v".repeat(200))).success).toBe(true);
    expect(fitItemsSchema.safeParse(withValue("v".repeat(201))).success).toBe(false);
  });

  it("rejects an unknown criterion, an unknown verdict and extra fields", () => {
    const replaceFirst = (patch: Record<string, unknown>) =>
      items().map((item, index) => (index === 0 ? { ...item, ...patch } : item));
    expect(fitItemsSchema.safeParse(replaceFirst({ criterion: "LOCATION" })).success).toBe(false);
    expect(fitItemsSchema.safeParse(replaceFirst({ verdict: "PARTIAL" })).success).toBe(false);
    expect(fitItemsSchema.safeParse(replaceFirst({ score: 3 })).success).toBe(false);
  });
});

describe("parseStoredFitAnalysis", () => {
  it("returns null for a missing analysis", () => {
    expect(parseStoredFitAnalysis(null)).toBeNull();
    expect(parseStoredFitAnalysis(undefined)).toBeNull();
  });

  it("returns the stored analysis in the fixed criterion order", () => {
    const parsed = parseStoredFitAnalysis({ items: [...items()].reverse(), analyzedAt: ANALYZED_AT });

    expect(parsed?.analyzedAt).toBe(ANALYZED_AT);
    expect(parsed?.items.map((item) => item.criterion)).toEqual([...FIT_CRITERIA]);
    expect(parsed?.items[0]).toEqual(items()[0]);
  });

  it("returns null for invalid stored data instead of throwing", () => {
    expect(parseStoredFitAnalysis("not an object")).toBeNull();
    expect(parseStoredFitAnalysis({ items: items() })).toBeNull();
    expect(parseStoredFitAnalysis({ items: items(), analyzedAt: "yesterday" })).toBeNull();
    expect(parseStoredFitAnalysis({ items: items().slice(0, 3), analyzedAt: ANALYZED_AT })).toBeNull();
    expect(parseStoredFitAnalysis({ items: items(), analyzedAt: ANALYZED_AT, extra: true })).toBeNull();
  });
});

describe("fitMismatchCountOf", () => {
  it("prefers the stored list count and falls back to counting the full analysis", () => {
    expect(fitMismatchCountOf({ fitMismatchCount: 3 })).toBe(3);
    expect(fitMismatchCountOf({ fitMismatchCount: 0 })).toBe(0);
    expect(fitMismatchCountOf({ fitAnalysis: { analyzedAt: "2026-11-03T10:00:00.000Z", items: items() } })).toBe(2);
  });

  it("is null for an application that was never analyzed", () => {
    expect(fitMismatchCountOf({})).toBeNull();
    expect(fitMismatchCountOf({ fitAnalysis: null, fitMismatchCount: null })).toBeNull();
  });
});

describe("countFitMismatches", () => {
  it("counts only MISMATCH verdicts", () => {
    expect(countFitMismatches(items())).toBe(2);
    expect(countFitMismatches(items().map((item) => ({ ...item, verdict: "UNKNOWN" as const })))).toBe(0);
  });
});

describe("normalizeFitResult", () => {
  it("orders the items, stamps the analysis date and turns blank values into null", () => {
    const shuffled = [...items()].reverse().map((item) =>
      item.criterion === "TECHNOLOGIES" ? { ...item, vacancyValue: "   ", yourValue: "" } : item,
    );

    const normalized = normalizeFitResult({ items: shuffled }, new Date(ANALYZED_AT));

    expect(normalized?.analyzedAt).toBe(ANALYZED_AT);
    expect(normalized?.items.map((item) => item.criterion)).toEqual([...FIT_CRITERIA]);
    expect(normalized?.items[4]).toMatchObject({ vacancyValue: null, yourValue: null });
  });

  it("produces a shape that parseStoredFitAnalysis reads back unchanged", () => {
    const normalized = normalizeFitResult({ items: items() }, new Date(ANALYZED_AT));

    expect(parseStoredFitAnalysis(JSON.parse(JSON.stringify(normalized)))).toEqual(normalized);
  });

  it("returns null for a result that does not have every criterion exactly once", () => {
    expect(normalizeFitResult({ items: items().slice(0, 4) }, new Date(ANALYZED_AT))).toBeNull();
    expect(normalizeFitResult(null, new Date(ANALYZED_AT))).toBeNull();
  });
});
