import { describe, expect, it } from "vitest";
import {
  AI_QUOTA_REQUEST_TYPE,
  extractAiQuotaReasonFromError,
  quotaForReason,
  resolveAiQuotaReason,
} from "@/lib/ai-quota";
import type { AiUsageStatusResponse } from "@/lib/api-types";

function usage(overrides: Partial<AiUsageStatusResponse> = {}): AiUsageStatusResponse {
  return {
    resetAt: "2026-08-10T00:00:00.000Z",
    vacancy: { used: 0, limit: 10, exhausted: false, pendingRequest: false },
    hr: { used: 0, limit: 10, exhausted: false, pendingRequest: false },
    tokens: { used: 0, limit: 20_000, exhausted: false, pendingRequest: false },
    ...overrides,
  };
}

describe("resolveAiQuotaReason", () => {
  it("returns null when usage hasn't loaded yet", () => {
    expect(resolveAiQuotaReason(undefined, "VACANCY_GENERATION")).toBeNull();
  });

  it("returns null when nothing is exhausted", () => {
    expect(resolveAiQuotaReason(usage(), "VACANCY_GENERATION")).toBeNull();
    expect(resolveAiQuotaReason(usage(), "HR_GENERATION")).toBeNull();
  });

  it("reports VACANCY_LIMIT_REACHED for VACANCY_GENERATION when only the vacancy quota is exhausted", () => {
    const status = usage({ vacancy: { used: 10, limit: 10, exhausted: true, pendingRequest: false } });
    expect(resolveAiQuotaReason(status, "VACANCY_GENERATION")).toBe("VACANCY_LIMIT_REACHED");
  });

  it("never reports the vacancy reason for HR_GENERATION (exhausting VACANCY_LIMIT must not disable HR)", () => {
    const status = usage({ vacancy: { used: 10, limit: 10, exhausted: true, pendingRequest: false } });
    expect(resolveAiQuotaReason(status, "HR_GENERATION")).toBeNull();
  });

  it("never reports the HR reason for VACANCY_GENERATION (exhausting HR_LIMIT must not disable vacancy analysis)", () => {
    const status = usage({ hr: { used: 10, limit: 10, exhausted: true, pendingRequest: false } });
    expect(resolveAiQuotaReason(status, "VACANCY_GENERATION")).toBeNull();
  });

  it("reports TOKEN_LIMIT_REACHED for both features when only the token budget is exhausted", () => {
    const status = usage({ tokens: { used: 20_000, limit: 20_000, exhausted: true, pendingRequest: false } });
    expect(resolveAiQuotaReason(status, "VACANCY_GENERATION")).toBe("TOKEN_LIMIT_REACHED");
    expect(resolveAiQuotaReason(status, "HR_GENERATION")).toBe("TOKEN_LIMIT_REACHED");
  });

  it("prefers the feature-specific reason over the token reason when both are exhausted", () => {
    const status = usage({
      vacancy: { used: 10, limit: 10, exhausted: true, pendingRequest: false },
      tokens: { used: 20_000, limit: 20_000, exhausted: true, pendingRequest: false },
    });
    expect(resolveAiQuotaReason(status, "VACANCY_GENERATION")).toBe("VACANCY_LIMIT_REACHED");
  });
});

describe("quotaForReason", () => {
  it("picks the matching quota field for each reason", () => {
    const status = usage({
      vacancy: { used: 1, limit: 10, exhausted: false, pendingRequest: false },
      hr: { used: 2, limit: 10, exhausted: false, pendingRequest: false },
      tokens: { used: 3, limit: 20_000, exhausted: false, pendingRequest: false },
    });

    expect(quotaForReason(status, "VACANCY_LIMIT_REACHED")).toBe(status.vacancy);
    expect(quotaForReason(status, "HR_LIMIT_REACHED")).toBe(status.hr);
    expect(quotaForReason(status, "TOKEN_LIMIT_REACHED")).toBe(status.tokens);
  });
});

describe("AI_QUOTA_REQUEST_TYPE", () => {
  it("maps each reason code to its request-more-usage type", () => {
    expect(AI_QUOTA_REQUEST_TYPE.VACANCY_LIMIT_REACHED).toBe("VACANCY_LIMIT");
    expect(AI_QUOTA_REQUEST_TYPE.HR_LIMIT_REACHED).toBe("HR_LIMIT");
    expect(AI_QUOTA_REQUEST_TYPE.TOKEN_LIMIT_REACHED).toBe("TOKEN_LIMIT");
  });
});

describe("extractAiQuotaReasonFromError", () => {
  it("extracts a known quota reason code", () => {
    expect(extractAiQuotaReasonFromError({ code: "HR_LIMIT_REACHED" })).toBe("HR_LIMIT_REACHED");
  });

  it("returns null for an unrelated code", () => {
    expect(extractAiQuotaReasonFromError({ code: "AI_ACCESS_REQUIRED" })).toBeNull();
  });

  it("returns null for missing or malformed details", () => {
    expect(extractAiQuotaReasonFromError(undefined)).toBeNull();
    expect(extractAiQuotaReasonFromError(null)).toBeNull();
    expect(extractAiQuotaReasonFromError("VACANCY_LIMIT_REACHED")).toBeNull();
    expect(extractAiQuotaReasonFromError({})).toBeNull();
  });
});
