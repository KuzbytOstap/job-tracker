"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/dashboard/app-header";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { ApplicationList } from "@/components/dashboard/application-list";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardEmptyState, type DashboardEmptyVariant } from "@/components/dashboard/dashboard-empty-state";
import { DashboardErrorState } from "@/components/dashboard/dashboard-error-state";
import { FloatingAddButton } from "@/components/dashboard/floating-add-button";
import { AddApplicationDialog } from "@/components/dashboard/add-application-dialog";
import { ApplicationDetailDialog } from "@/components/dashboard/application-detail-dialog";
import { useApplicationsQuery } from "@/hooks/use-applications";
import { useStatsQuery } from "@/hooks/use-stats";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { STATUS_TAB_ORDER, type StatusFilter } from "@/lib/labels";
import type { SortOption } from "@/lib/validation";
import type { ApplicationDTO } from "@/lib/api-types";

function isStatusFilter(value: string | null): value is StatusFilter {
  return value !== null && (STATUS_TAB_ORDER as string[]).includes(value);
}

export function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get("status");
  const status: StatusFilter = isStatusFilter(statusParam) ? statusParam : "ALL";

  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDTO | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleStatusChange = useCallback(
    (nextStatus: StatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus === "ALL") {
        params.delete("status");
      } else {
        params.set("status", nextStatus);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const statsQuery = useStatsQuery();
  const applicationsQuery = useApplicationsQuery({ status, sort, q: debouncedSearch });

  const applications = useMemo(
    () => applicationsQuery.data?.applications ?? [],
    [applicationsQuery.data],
  );
  const total = statsQuery.data?.total;

  const tabCounts = useMemo(() => {
    if (!statsQuery.data) return {};
    return { ALL: statsQuery.data.total, ...statsQuery.data.counts };
  }, [statsQuery.data]);

  const handleSelectApplication = useCallback((application: ApplicationDTO) => {
    setSelectedApplication(application);
    setDetailDialogOpen(true);
  }, []);

  const emptyVariant: DashboardEmptyVariant = debouncedSearch
    ? "search"
    : status === "ALL"
      ? "all"
      : "filtered";

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-160px] left-1/2 -z-10 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <AppHeader total={total} onAddClick={() => setAddDialogOpen(true)} />

      <StatusTabs value={status} onChange={handleStatusChange} counts={tabCounts} />

      <main className="mx-auto flex max-w-[1100px] flex-col gap-4 px-4 pt-2 pb-24 sm:px-6 sm:pb-16">
        <DashboardControls
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
        />

        {applicationsQuery.isError ? (
          <DashboardErrorState onRetry={() => applicationsQuery.refetch()} />
        ) : applicationsQuery.isPending ? (
          <DashboardSkeleton />
        ) : applications.length === 0 ? (
          <DashboardEmptyState
            variant={emptyVariant}
            searchQuery={debouncedSearch}
            onAddClick={() => setAddDialogOpen(true)}
          />
        ) : (
          <ApplicationList
            applications={applications}
            sort={sort}
            onSelectApplication={handleSelectApplication}
          />
        )}
      </main>

      <FloatingAddButton onClick={() => setAddDialogOpen(true)} />

      <AddApplicationDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ApplicationDetailDialog
        application={selectedApplication}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
