import { Status } from "@/app/generated/prisma/enums";
import type { UpdateApplicationPayload } from "@/lib/api-types";

export const PRIMARY_PIPELINE_STATUSES: readonly Status[] = [
  Status.APPLIED,
  Status.HR_REPLIED,
  Status.HR_CALL,
  Status.TECH_INTERVIEW,
  Status.OFFER,
];

export const TEST_TASK_SOURCE_STATUSES: readonly Status[] = [Status.HR_CALL, Status.TECH_INTERVIEW];

export const TEST_TASK_RETURN_STATUS = Status.TECH_INTERVIEW;

export function canEnterTestTaskFrom(status: Status): boolean {
  return TEST_TASK_SOURCE_STATUSES.includes(status);
}

export function resolveMoveStatusPayload(targetStatus: Status): UpdateApplicationPayload {
  if (targetStatus === Status.TEST_TASK) {
    return { status: targetStatus, hasTestTask: true };
  }
  return { status: targetStatus };
}

export function primaryPipelineIndex(status: Status): number {
  return PRIMARY_PIPELINE_STATUSES.indexOf(status);
}

export function isPrimaryPipelineStatus(status: Status): boolean {
  return primaryPipelineIndex(status) !== -1;
}

export function isForwardPipelineMove(from: Status, to: Status): boolean {
  const fromIndex = primaryPipelineIndex(from);
  const toIndex = primaryPipelineIndex(to);
  if (fromIndex === -1 || toIndex === -1) return true;
  return toIndex > fromIndex;
}

type RestoreSource = {
  status: Status;
  statusChanges: readonly { fromStatus: Status; toStatus: Status }[];
};

/**
 * Restoring a terminal (REJECTED/IGNORED) application returns it to whatever
 * stored status it held right before it became terminal, read from the most
 * recent status-history entry that landed on the current status. Falls back
 * to APPLIED if no such history exists.
 */
export function resolveRestoreTargetStatus(application: RestoreSource): Status {
  const lastTransitionIntoCurrent = application.statusChanges.find(
    (change) => change.toStatus === application.status,
  );
  return lastTransitionIntoCurrent?.fromStatus ?? Status.APPLIED;
}

export function hasReachedPipelineStage(
  currentStatus: Status,
  stage: Status,
  statusHistoryToStatuses: readonly Status[],
): boolean {
  if (currentStatus === stage) return true;
  const stageIndex = primaryPipelineIndex(stage);
  const currentIndex = primaryPipelineIndex(currentStatus);
  if (stageIndex !== -1 && currentIndex !== -1 && currentIndex > stageIndex) return true;
  return statusHistoryToStatuses.includes(stage);
}
