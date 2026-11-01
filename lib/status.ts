import { Status } from "@/app/generated/prisma/enums";
import type { JobApplication } from "@/app/generated/prisma/client";

export const AUTO_IGNORE_AFTER_DAYS = 21;
export const AUTO_IGNORE_MIN_DAYS = 1;
export const AUTO_IGNORE_MAX_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const TERMINAL_STATUSES: readonly Status[] = [
  Status.OFFER,
  Status.REJECTED,
  Status.IGNORED,
];

export const REPLIED_OR_FURTHER_STATUSES: ReadonlySet<Status> = new Set([
  Status.HR_REPLIED,
  Status.HR_CALL,
  Status.TECH_INTERVIEW,
  Status.TEST_TASK,
  Status.OFFER,
]);

export const INTERVIEW_OR_FURTHER_STATUSES: ReadonlySet<Status> = new Set([
  Status.TECH_INTERVIEW,
  Status.TEST_TASK,
  Status.OFFER,
]);

export type StatusSource = Pick<JobApplication, "status" | "lastActivityAt">;

export function effectiveStatus(
  application: StatusSource,
  now: Date,
  autoIgnoreAfterDays: number | null = AUTO_IGNORE_AFTER_DAYS,
): Status {
  if (TERMINAL_STATUSES.includes(application.status) || autoIgnoreAfterDays === null) {
    return application.status;
  }

  const daysSinceActivity =
    (now.getTime() - application.lastActivityAt.getTime()) / MS_PER_DAY;

  if (daysSinceActivity > autoIgnoreAfterDays) {
    return Status.IGNORED;
  }

  return application.status;
}
