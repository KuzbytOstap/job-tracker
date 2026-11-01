import { AiAccessStatus, AiRequestStatus, AiRequestType, Platform, Status } from "@/app/generated/prisma/enums";
import type { DateGroupKey } from "@/lib/date-grouping";
import type { PlatformOptionDTO } from "@/lib/api-types";
import type { MessageKey } from "@/lib/i18n/messages";
import type { Translator } from "@/lib/i18n/translate";
import type { ReviewReason } from "@/lib/review-reasons";
import type { FunnelStageKey, StatSummaryKey } from "@/lib/stats";
import type { SortOption } from "@/lib/validation";

export const STATUS_LABEL_KEYS: Record<Status, MessageKey> = {
  APPLIED: "labels.status.applied",
  HR_REPLIED: "labels.status.hrReplied",
  HR_CALL: "labels.status.hrCall",
  TECH_INTERVIEW: "labels.status.techInterview",
  TEST_TASK: "labels.status.testTask",
  OFFER: "labels.status.offer",
  REJECTED: "labels.status.rejected",
  IGNORED: "labels.status.ignored",
};

export const PLATFORM_LABEL_KEYS: Record<Platform, MessageKey> = {
  DJINNI: "labels.platform.djinni",
  DOU: "labels.platform.dou",
  LINKEDIN: "labels.platform.linkedin",
  ROBOTA_UA: "labels.platform.robotaUa",
  DIRECT: "labels.platform.direct",
  OTHER: "labels.platform.other",
};

export function platformOptionLabel(
  t: Translator,
  option: Pick<PlatformOptionDTO, "label" | "platform" | "customPlatformId">,
): string {
  return option.customPlatformId ? option.label : t(PLATFORM_LABEL_KEYS[option.platform]);
}

export const SORT_LABEL_KEYS: Record<SortOption, MessageKey> = {
  newest: "labels.sort.newest",
  oldest: "labels.sort.oldest",
  activity: "labels.sort.activity",
  company: "labels.sort.company",
};

export const EMPTY_COLUMN_KEYS: Record<Status, MessageKey> = {
  APPLIED: "board.empty.applied",
  HR_REPLIED: "board.empty.hrReplied",
  HR_CALL: "board.empty.hrCall",
  TECH_INTERVIEW: "board.empty.techInterview",
  TEST_TASK: "board.empty.testTask",
  OFFER: "board.empty.offer",
  REJECTED: "board.empty.rejected",
  IGNORED: "board.empty.ignored",
};

export const STAT_SUMMARY_LABEL_KEYS: Record<StatSummaryKey, MessageKey> = {
  total: "stats.summary.total",
  waiting: "stats.summary.waiting",
  replied: "stats.summary.replied",
  interviews: "stats.summary.interviews",
  offers: "stats.summary.offers",
};

export const FUNNEL_LABEL_KEYS: Record<FunnelStageKey, MessageKey> = {
  applied: "stats.funnel.applied",
  replied: "stats.funnel.replied",
  interviews: "stats.funnel.interviews",
  offers: "stats.funnel.offers",
};

export const DATE_GROUP_LABEL_KEYS: Record<DateGroupKey, MessageKey> = {
  today: "dashboard.dateGroups.today",
  yesterday: "dashboard.dateGroups.yesterday",
  twoDaysAgo: "dashboard.dateGroups.twoDaysAgo",
  earlier: "dashboard.dateGroups.earlier",
};

export const REVIEW_REASON_LABEL_KEYS: Record<ReviewReason, MessageKey> = {
  salary: "review.reasons.salary",
  platform: "review.reasons.platform",
  company: "review.reasons.company",
  position: "review.reasons.position",
  details: "review.reasons.details",
  not_vacancy: "review.reasons.notVacancy",
};

export const AI_ACCESS_STATUS_LABEL_KEYS: Record<AiAccessStatus, MessageKey> = {
  NOT_REQUESTED: "admin.labels.accessStatus.notRequested",
  PENDING: "admin.labels.accessStatus.pending",
  APPROVED: "admin.labels.accessStatus.approved",
  REJECTED: "admin.labels.accessStatus.rejected",
  SUSPENDED: "admin.labels.accessStatus.suspended",
};

export const AI_REQUEST_TYPE_LABEL_KEYS: Record<AiRequestType, MessageKey> = {
  AI_ACCESS: "admin.labels.requestType.aiAccess",
  VACANCY_LIMIT: "admin.labels.requestType.vacancyLimit",
  HR_LIMIT: "admin.labels.requestType.hrLimit",
  TOKEN_LIMIT: "admin.labels.requestType.tokenLimit",
};

export const AI_REQUEST_STATUS_LABEL_KEYS: Record<AiRequestStatus, MessageKey> = {
  PENDING: "admin.labels.requestStatus.pending",
  APPROVED: "admin.labels.requestStatus.approved",
  REJECTED: "admin.labels.requestStatus.rejected",
};
