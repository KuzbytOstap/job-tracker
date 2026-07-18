import {
  BOARD_COLUMNS_BY_STATUS,
  distributeApplicationsIntoColumns,
  type BoardColumnConfig,
} from "@/lib/board-columns";
import { groupApplicationsByAppliedDate, type GroupableApplication } from "@/lib/date-grouping";
import type { SortOption } from "@/lib/validation";
import type { Status } from "@/app/generated/prisma/enums";

export type MobileStatusCount = {
  column: BoardColumnConfig;
  count: number;
};

export type MobileStatusGroup<T> = {
  column: BoardColumnConfig;
  applications: T[];
};

function orderForDisplay<T extends GroupableApplication>(
  applications: readonly T[],
  sort: SortOption,
): T[] {
  return groupApplicationsByAppliedDate([...applications], sort).flatMap((group) => group.applications);
}

export function getMobileStatusCounts<T extends { effectiveStatus: Status }>(
  applications: readonly T[],
): MobileStatusCount[] {
  return distributeApplicationsIntoColumns(applications).map((bucket) => ({
    column: BOARD_COLUMNS_BY_STATUS[bucket.status],
    count: bucket.applications.length,
  }));
}

export function getMobileStatusGroups<T extends GroupableApplication & { effectiveStatus: Status }>(
  applications: readonly T[],
  sort: SortOption,
): MobileStatusGroup<T>[] {
  return distributeApplicationsIntoColumns(applications)
    .map((bucket) => ({
      column: BOARD_COLUMNS_BY_STATUS[bucket.status],
      applications: orderForDisplay(bucket.applications, sort),
    }))
    .filter((group) => group.applications.length > 0);
}

export function getMobileSingleStatusApplications<
  T extends GroupableApplication & { effectiveStatus: Status },
>(applications: readonly T[], status: Status, sort: SortOption): T[] {
  return orderForDisplay(
    applications.filter((application) => application.effectiveStatus === status),
    sort,
  );
}
