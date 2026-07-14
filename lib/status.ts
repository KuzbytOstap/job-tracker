import { Status, type JobApplication } from "@/app/generated/prisma/client";

export const AUTO_IGNORE_AFTER_DAYS = 21;

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

export function effectiveStatus(application: StatusSource, now: Date): Status {
  if (TERMINAL_STATUSES.includes(application.status)) {
    return application.status;
  }

  const daysSinceActivity =
    (now.getTime() - application.lastActivityAt.getTime()) / MS_PER_DAY;

  if (daysSinceActivity > AUTO_IGNORE_AFTER_DAYS) {
    return Status.IGNORED;
  }

  return application.status;
}
