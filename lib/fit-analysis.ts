import { z } from "zod";
import type { FitAnalysisDTO, FitCriterionValue, FitItemDTO, FitVerdictValue } from "@/lib/api-types";

export const FIT_CRITERIA = [
  "SALARY",
  "WORK_FORMAT",
  "EMPLOYMENT_TYPE",
  "EXPERIENCE_YEARS",
  "TECHNOLOGIES",
] as const satisfies readonly FitCriterionValue[];

export const FIT_VERDICTS = ["MATCH", "MISMATCH", "UNKNOWN"] as const satisfies readonly FitVerdictValue[];

export const FIT_VALUE_MAX_LENGTH = 200;
export const FIT_REASON_MAX_LENGTH = 300;

export const fitItemSchema = z
  .object({
    criterion: z.enum(FIT_CRITERIA),
    verdict: z.enum(FIT_VERDICTS),
    vacancyValue: z.string().trim().max(FIT_VALUE_MAX_LENGTH).nullable(),
    yourValue: z.string().trim().max(FIT_VALUE_MAX_LENGTH).nullable(),
    reason: z.string().trim().min(1).max(FIT_REASON_MAX_LENGTH),
  })
  .strict();

function hasEveryCriterionOnce(items: readonly { criterion: FitCriterionValue }[]): boolean {
  const seen = new Set(items.map((item) => item.criterion));
  return items.length === FIT_CRITERIA.length && seen.size === FIT_CRITERIA.length;
}

export const fitItemsSchema = z
  .array(fitItemSchema)
  .length(FIT_CRITERIA.length)
  .refine(hasEveryCriterionOnce, { message: "every criterion must appear exactly once" });

const fitResultSchema = z.object({ items: fitItemsSchema }).strict();

const storedFitAnalysisSchema = z
  .object({
    items: fitItemsSchema,
    analyzedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), { message: "invalid date" }),
  })
  .strict();

function sortByCriterionOrder(items: readonly FitItemDTO[]): FitItemDTO[] {
  return [...items].sort((a, b) => FIT_CRITERIA.indexOf(a.criterion) - FIT_CRITERIA.indexOf(b.criterion));
}

export function parseStoredFitAnalysis(value: unknown): FitAnalysisDTO | null {
  if (value === null || value === undefined) return null;
  const result = storedFitAnalysisSchema.safeParse(value);
  if (!result.success) return null;
  return { items: sortByCriterionOrder(result.data.items), analyzedAt: result.data.analyzedAt };
}

export function countFitMismatches(items: readonly Pick<FitItemDTO, "verdict">[]): number {
  return items.filter((item) => item.verdict === "MISMATCH").length;
}

export function fitMismatchCountOf(source: {
  fitAnalysis?: FitAnalysisDTO | null;
  fitMismatchCount?: number | null;
}): number | null {
  if (source.fitMismatchCount !== undefined && source.fitMismatchCount !== null) return source.fitMismatchCount;
  return source.fitAnalysis ? countFitMismatches(source.fitAnalysis.items) : null;
}

export function normalizeFitResult(result: unknown, analyzedAt: Date): FitAnalysisDTO | null {
  const parsed = fitResultSchema.safeParse(result);
  if (!parsed.success) return null;
  const items = parsed.data.items.map((item) => ({
    criterion: item.criterion,
    verdict: item.verdict,
    vacancyValue: item.vacancyValue || null,
    yourValue: item.yourValue || null,
    reason: item.reason,
  }));
  return { items: sortByCriterionOrder(items), analyzedAt: analyzedAt.toISOString() };
}
