import type { MessageKey } from "@/lib/i18n/messages";

const SKIP_REASON_KEYS: Record<string, MessageKey> = {
  AI_ACCESS_REQUIRED: "profile.ai.reasons.aiAccessRequired",
  AI_SUSPENDED: "profile.ai.reasons.aiSuspended",
  PROFILE_LIMIT_REACHED: "profile.ai.reasons.profileLimit",
  COVER_LETTER_LIMIT_REACHED: "profile.ai.reasons.coverLetterLimit",
  FIT_ANALYSIS_LIMIT_REACHED: "profile.ai.reasons.fitAnalysisLimit",
  TOKEN_LIMIT_REACHED: "profile.ai.reasons.tokenLimit",
  PROVIDER_FAILED: "profile.ai.reasons.providerFailed",
  NO_CV_TEXT: "profile.ai.reasons.noCvText",
  NO_VACANCY_TEXT: "profile.ai.reasons.noVacancyText",
  CV_NOT_FOUND: "profile.ai.reasons.cvNotFound",
};

export function skipReasonMessageKey(reason: string | null): MessageKey {
  return (reason !== null && SKIP_REASON_KEYS[reason]) || "profile.ai.reasons.generic";
}
