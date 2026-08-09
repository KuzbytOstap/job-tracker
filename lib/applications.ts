import { Status } from "@/app/generated/prisma/client";
import type {
  JobApplication,
  StatusChange,
  Prisma,
} from "@/app/generated/prisma/client";
import { effectiveStatus } from "@/lib/status";
import { parseStoredHrInterviewQuestionSet } from "@/lib/hr-interview-questions";
import type { SortOption } from "@/lib/validation";
import type { ApplicationDTO, ApplicationListItemDTO } from "@/lib/api-types";

export type ApplicationWithHistory = JobApplication & {
  statusChanges: StatusChange[];
};

export type ApplicationWithMeta = ApplicationWithHistory & {
  effectiveStatus: Status;
  isAutoIgnored: boolean;
};

// Columns required to build an ApplicationListItemDTO — deliberately excludes
// the heavy detail fields (jobPostingText, coverLetterText, notes,
// hrInterviewQuestions, statusChanges). effectiveStatus/isAutoIgnored are
// derived from status + lastActivityAt, both of which are selected here.
export const APPLICATION_LIST_ITEM_SELECT = {
  id: true,
  company: true,
  position: true,
  platform: true,
  link: true,
  status: true,
  hasTestTask: true,
  testTaskDone: true,
  salaryExpectation: true,
  appliedAt: true,
  lastActivityAt: true,
  updatedAt: true,
} satisfies Prisma.JobApplicationSelect;

export type ApplicationListItemRow = Prisma.JobApplicationGetPayload<{
  select: typeof APPLICATION_LIST_ITEM_SELECT;
}>;

export type ApplicationListItemWithMeta = ApplicationListItemRow & {
  effectiveStatus: Status;
  isAutoIgnored: boolean;
};

export function toApplicationListItemWithMeta(
  row: ApplicationListItemRow,
  now: Date,
): ApplicationListItemWithMeta {
  const computedStatus = effectiveStatus(row, now);

  return {
    ...row,
    effectiveStatus: computedStatus,
    isAutoIgnored: row.status !== Status.IGNORED && computedStatus === Status.IGNORED,
  };
}

export function toApplicationListItemDTO(item: ApplicationListItemWithMeta): ApplicationListItemDTO {
  return {
    ...item,
    appliedAt: item.appliedAt.toISOString(),
    lastActivityAt: item.lastActivityAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function buildApplicationsWhere(q: string, userId: string): Prisma.JobApplicationWhereInput {
  if (!q) {
    return { userId };
  }

  return {
    userId,
    OR: [
      { company: { contains: q, mode: "insensitive" } },
      { position: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function toApplicationWithMeta(
  application: ApplicationWithHistory,
  now: Date,
): ApplicationWithMeta {
  const computedStatus = effectiveStatus(application, now);

  return {
    ...application,
    effectiveStatus: computedStatus,
    isAutoIgnored: application.status !== Status.IGNORED && computedStatus === Status.IGNORED,
  };
}

export function toApplicationDTO(application: ApplicationWithMeta): ApplicationDTO {
  // userId is an internal ownership column, not part of the public API shape.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _userId, ...rest } = application;

  return {
    ...rest,
    appliedAt: application.appliedAt.toISOString(),
    lastActivityAt: application.lastActivityAt.toISOString(),
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
    hrInterviewQuestions: parseStoredHrInterviewQuestionSet(application.hrInterviewQuestions),
    hrQuestionsGeneratedAt: application.hrQuestionsGeneratedAt
      ? application.hrQuestionsGeneratedAt.toISOString()
      : null,
    statusChanges: application.statusChanges.map((change) => ({
      ...change,
      changedAt: change.changedAt.toISOString(),
    })),
  };
}

export function resolveTestTaskFlags(
  input: { hasTestTask?: boolean; testTaskDone?: boolean },
  existing: { hasTestTask: boolean; testTaskDone: boolean },
): { hasTestTask: boolean; testTaskDone: boolean } {
  let hasTestTask = input.hasTestTask ?? existing.hasTestTask;
  let testTaskDone = input.testTaskDone ?? existing.testTaskDone;

  if (testTaskDone) {
    hasTestTask = true;
  }

  if (input.hasTestTask === false) {
    hasTestTask = false;
    testTaskDone = false;
  }

  return { hasTestTask, testTaskDone };
}

export function sortApplications<
  T extends { appliedAt: Date; lastActivityAt: Date; company: string },
>(applications: T[], sort: SortOption): T[] {
  const sorted = [...applications];

  switch (sort) {
    case "newest":
      sorted.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
      break;
    case "oldest":
      sorted.sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime());
      break;
    case "activity":
      sorted.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
      break;
    case "company":
      sorted.sort((a, b) => a.company.localeCompare(b.company, undefined, { sensitivity: "base" }));
      break;
  }

  return sorted;
}
