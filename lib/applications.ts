import { Status } from "@/app/generated/prisma/client";
import type {
  JobApplication,
  StatusChange,
  Prisma,
} from "@/app/generated/prisma/client";
import { effectiveStatus } from "@/lib/status";
import type { SortOption } from "@/lib/validation";
import type { ApplicationDTO } from "@/lib/api-types";

export type ApplicationWithHistory = JobApplication & {
  statusChanges: StatusChange[];
};

export type ApplicationWithMeta = ApplicationWithHistory & {
  effectiveStatus: Status;
  isAutoIgnored: boolean;
};

export function buildApplicationsWhere(q: string): Prisma.JobApplicationWhereInput {
  if (!q) {
    return {};
  }

  return {
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
  return {
    ...application,
    appliedAt: application.appliedAt.toISOString(),
    lastActivityAt: application.lastActivityAt.toISOString(),
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
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

export function sortApplications<T extends ApplicationWithHistory>(
  applications: T[],
  sort: SortOption,
): T[] {
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
