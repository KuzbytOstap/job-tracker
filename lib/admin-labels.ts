import { AiAccessStatus, AiRequestStatus, AiRequestType } from "@/app/generated/prisma/enums";
import type { AiUsageRequestType } from "@/lib/api-types";

export const AI_ACCESS_STATUS_LABELS: Record<AiAccessStatus, string> = {
  NOT_REQUESTED: "Not requested",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export const AI_ACCESS_STATUS_BADGE_CLASSES: Record<AiAccessStatus, string> = {
  NOT_REQUESTED: "bg-gray-200/70 text-gray-600 dark:bg-gray-400/15 dark:text-gray-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
  SUSPENDED: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
};

export const AI_REQUEST_TYPE_LABELS: Record<AiRequestType, string> = {
  AI_ACCESS: "AI access",
  VACANCY_LIMIT: "Vacancy limit",
  HR_LIMIT: "HR limit",
  TOKEN_LIMIT: "Token limit",
};

export const AI_REQUEST_STATUS_LABELS: Record<AiRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const AI_REQUEST_STATUS_BADGE_CLASSES: Record<AiRequestStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
};

export const USAGE_REQUEST_QUOTA_FIELD: Record<AiUsageRequestType, "vacancy" | "hr" | "tokens"> = {
  VACANCY_LIMIT: "vacancy",
  HR_LIMIT: "hr",
  TOKEN_LIMIT: "tokens",
};

export function isUsageRequestType(type: AiRequestType): type is AiUsageRequestType {
  return type === AiRequestType.VACANCY_LIMIT || type === AiRequestType.HR_LIMIT || type === AiRequestType.TOKEN_LIMIT;
}
