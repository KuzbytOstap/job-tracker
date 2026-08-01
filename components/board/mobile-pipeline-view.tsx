"use client";

import { useMemo, useState } from "react";
import { MobileStatusNavigation } from "@/components/board/mobile-status-navigation";
import { MobileApplicationList } from "@/components/board/mobile-application-list";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import {
  getMobileSingleStatusApplications,
  getMobileStatusCounts,
  getMobileStatusGroups,
} from "@/lib/mobile-pipeline";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";
import type { Status } from "@/app/generated/prisma/enums";

type MobilePipelineViewProps = {
  applications: ApplicationListItemDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
};

export function MobilePipelineView({
  applications,
  sort,
  onSelectApplication,
}: MobilePipelineViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<Status | "ALL">("ALL");

  const statusCounts = useMemo(() => getMobileStatusCounts(applications), [applications]);
  const statusGroups = useMemo(() => getMobileStatusGroups(applications, sort), [applications, sort]);

  const selectedColumn =
    selectedStatus === "ALL"
      ? undefined
      : statusCounts.find((entry) => entry.column.status === selectedStatus)?.column;

  const singleStatusApplications = useMemo(
    () =>
      selectedColumn
        ? getMobileSingleStatusApplications(applications, selectedColumn.status, sort)
        : [],
    [applications, sort, selectedColumn],
  );

  return (
    <div className="flex flex-col gap-4">
      <MobileStatusNavigation
        statusCounts={statusCounts}
        totalCount={applications.length}
        selected={selectedStatus}
        onSelect={setSelectedStatus}
      />

      {selectedStatus === "ALL" ? (
        <div className="flex flex-col gap-6">
          {statusGroups.map((group) => (
            <MobileApplicationList
              key={group.column.status}
              applications={group.applications}
              onSelectApplication={onSelectApplication}
              heading={{
                label: group.column.label,
                count: group.applications.length,
                dotClassName: group.column.dotClassName,
              }}
            />
          ))}
        </div>
      ) : singleStatusApplications.length === 0 ? (
        <DashboardEmptyState variant="filtered" />
      ) : (
        <MobileApplicationList
          applications={singleStatusApplications}
          onSelectApplication={onSelectApplication}
          heading={
            selectedColumn && {
              label: selectedColumn.label,
              count: singleStatusApplications.length,
              dotClassName: selectedColumn.dotClassName,
            }
          }
        />
      )}
    </div>
  );
}
