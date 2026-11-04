import type { AiQuotaStatus, AiUsageRequestType, AiUsageStatusResponse } from "@/lib/api-types";

export type AiQuotaReasonCode =
  | "VACANCY_LIMIT_REACHED"
  | "HR_LIMIT_REACHED"
  | "PROFILE_LIMIT_REACHED"
  | "COVER_LETTER_LIMIT_REACHED"
  | "FIT_ANALYSIS_LIMIT_REACHED"
  | "TOKEN_LIMIT_REACHED";

export type RequestableAiQuotaReasonCode = Exclude<
  AiQuotaReasonCode,
  "PROFILE_LIMIT_REACHED" | "COVER_LETTER_LIMIT_REACHED" | "FIT_ANALYSIS_LIMIT_REACHED"
>;

export const AI_QUOTA_REQUEST_TYPE: Record<RequestableAiQuotaReasonCode, AiUsageRequestType> = {
  VACANCY_LIMIT_REACHED: "VACANCY_LIMIT",
  HR_LIMIT_REACHED: "HR_LIMIT",
  TOKEN_LIMIT_REACHED: "TOKEN_LIMIT",
};

/**
 * Determines which quota is currently blocking a given AI feature, mirroring
 * the check order the server itself uses when a reservation is rejected
 * (`throwSpecificReservationError` in lib/ai/access-control.ts): the
 * feature's own daily counter is checked before the shared token budget, so
 * exhausting VACANCY_LIMIT never reports as blocking HR generation (or vice
 * versa) while exhausting TOKEN_LIMIT reports for both. Returns null when
 * nothing is exhausted, or when usage hasn't loaded yet — never blocks
 * optimistically without data.
 */
export function resolveAiQuotaReason(
  usage: AiUsageStatusResponse | undefined,
  feature: "VACANCY_GENERATION" | "HR_GENERATION" | "PROFILE" | "COVER_LETTER" | "FIT_ANALYSIS",
): AiQuotaReasonCode | null {
  if (!usage) return null;

  if (feature === "VACANCY_GENERATION" && usage.vacancy.exhausted) return "VACANCY_LIMIT_REACHED";
  if (feature === "HR_GENERATION" && usage.hr.exhausted) return "HR_LIMIT_REACHED";
  if (feature === "PROFILE" && usage.profile.exhausted) return "PROFILE_LIMIT_REACHED";
  if (feature === "COVER_LETTER" && usage.coverLetter.exhausted) return "COVER_LETTER_LIMIT_REACHED";
  if (feature === "FIT_ANALYSIS" && usage.fitAnalysis.exhausted) return "FIT_ANALYSIS_LIMIT_REACHED";
  if (usage.tokens.exhausted) return "TOKEN_LIMIT_REACHED";
  return null;
}

export function quotaForReason(usage: AiUsageStatusResponse, reason: AiQuotaReasonCode): AiQuotaStatus {
  switch (reason) {
    case "VACANCY_LIMIT_REACHED":
      return usage.vacancy;
    case "HR_LIMIT_REACHED":
      return usage.hr;
    case "PROFILE_LIMIT_REACHED":
      return usage.profile;
    case "COVER_LETTER_LIMIT_REACHED":
      return usage.coverLetter;
    case "FIT_ANALYSIS_LIMIT_REACHED":
      return usage.fitAnalysis;
    case "TOKEN_LIMIT_REACHED":
      return usage.tokens;
  }
}

/**
 * Reads an `ApiError.details` payload for a quota-exhaustion code, used as
 * an immediate fallback right after a failed AI call — before the AI usage
 * query has had a chance to refetch and reflect the new exhausted state.
 */
export function extractAiQuotaReasonFromError(details: unknown): AiQuotaReasonCode | null {
  if (typeof details !== "object" || details === null || !("code" in details)) return null;
  const code = (details as { code: unknown }).code;
  if (
    code === "VACANCY_LIMIT_REACHED" ||
    code === "HR_LIMIT_REACHED" ||
    code === "PROFILE_LIMIT_REACHED" ||
    code === "COVER_LETTER_LIMIT_REACHED" ||
    code === "FIT_ANALYSIS_LIMIT_REACHED" ||
    code === "TOKEN_LIMIT_REACHED"
  ) {
    return code;
  }
  return null;
}
