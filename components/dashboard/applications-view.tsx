"use client";

import { useMemo } from "react";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { ApplicationList } from "@/components/dashboard/application-list";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import {
  DashboardEmptyState,
  type DashboardEmptyVariant,
} from "@/components/dashboard/dashboard-empty-state";
import { DashboardErrorState } from "@/components/dashboard/dashboard-error-state";
import { useApplicationsQuery } from "@/hooks/use-applications";
import type { SortOption, StatusFilter } from "@/lib/validation";
import type { ApplicationListItemDTO } from "@/lib/api-types";

type ApplicationsViewProps = {
  status: StatusFilter;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  search: string;
  onSearchChange: (value: string) => void;
  debouncedSearch: string;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
  onAddClick: () => void;
  visualVariant?: "default" | "gameHub";
};

export function ApplicationsView({
  status,
  sort,
  onSortChange,
  search,
  onSearchChange,
  debouncedSearch,
  onSelectApplication,
  onAddClick,
  visualVariant = "default",
}: ApplicationsViewProps) {
  const applicationsQuery = useApplicationsQuery({ status, sort, q: debouncedSearch });

  const applications = useMemo(
    () => applicationsQuery.data?.applications ?? [],
    [applicationsQuery.data],
  );

  const emptyVariant: DashboardEmptyVariant = debouncedSearch
    ? "search"
    : status === "ALL"
      ? "all"
      : "filtered";

  return (
    <div className="flex flex-col gap-4">
      <DashboardControls
        search={search}
        onSearchChange={onSearchChange}
        sort={sort}
        onSortChange={onSortChange}
        visualVariant={visualVariant}
      />

      {applicationsQuery.isError ? (
        <DashboardErrorState onRetry={() => applicationsQuery.refetch()} visualVariant={visualVariant} />
      ) : applicationsQuery.isPending ? (
        <DashboardSkeleton visualVariant={visualVariant} />
      ) : applications.length === 0 ? (
        <DashboardEmptyState
          variant={emptyVariant}
          searchQuery={debouncedSearch}
          onAddClick={onAddClick}
          visualVariant={visualVariant}
        />
      ) : (
        <ApplicationList
          applications={applications}
          sort={sort}
          onSelectApplication={onSelectApplication}
          visualVariant={visualVariant}
        />
      )}
    </div>
  );
}
