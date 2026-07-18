"use client";

import { useState } from "react";
import { AppHeader } from "@/components/dashboard/app-header";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardErrorState } from "@/components/dashboard/dashboard-error-state";
import { FloatingAddButton } from "@/components/dashboard/floating-add-button";
import { AddApplicationDialog } from "@/components/dashboard/add-application-dialog";
import { ApplicationDetailDialog } from "@/components/dashboard/application-detail-dialog";
import { KanbanBoard } from "@/components/board/kanban-board";
import { KanbanDndContext } from "@/components/board/kanban-dnd-context";
import { MobilePipelineView } from "@/components/board/mobile-pipeline-view";
import { BoardSkeleton } from "@/components/board/board-skeleton";
import { BoardStats } from "@/components/board/board-stats";
import { useApplicationsQuery } from "@/hooks/use-applications";
import { useStatsQuery } from "@/hooks/use-stats";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApplicationDetailState } from "@/hooks/use-application-detail";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { SortOption } from "@/lib/validation";

export function BoardShell() {
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const detail = useApplicationDetailState();

  const statsQuery = useStatsQuery();
  const applicationsQuery = useApplicationsQuery({ status: "ALL", sort, q: debouncedSearch });
  const applications = applicationsQuery.data?.applications ?? [];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-160px] left-1/2 -z-10 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <AppHeader total={statsQuery.data?.total} onAddClick={() => setAddDialogOpen(true)} />

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6">
        <DashboardControls
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
        />
      </div>

      <BoardStats />

      <div className="pt-4 pb-24 sm:pb-16">
        {applicationsQuery.isError ? (
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
            <DashboardErrorState onRetry={() => applicationsQuery.refetch()} />
          </div>
        ) : applicationsQuery.isPending ? (
          <BoardSkeleton />
        ) : applications.length === 0 ? (
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
            <DashboardEmptyState
              variant={debouncedSearch ? "search" : "all"}
              searchQuery={debouncedSearch}
              onAddClick={() => setAddDialogOpen(true)}
            />
          </div>
        ) : isDesktop ? (
          <KanbanDndContext>
            <KanbanBoard
              applications={applications}
              sort={sort}
              onSelectApplication={(application) => detail.openDetail(application.id)}
            />
          </KanbanDndContext>
        ) : (
          <div className="mx-auto w-full max-w-[760px] px-4">
            <MobilePipelineView
              applications={applications}
              sort={sort}
              onSelectApplication={(application) => detail.openDetail(application.id)}
            />
          </div>
        )}
      </div>

      <FloatingAddButton onClick={() => setAddDialogOpen(true)} />

      <AddApplicationDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ApplicationDetailDialog
        applicationId={detail.selectedApplicationId}
        open={detail.open}
        onOpenChange={detail.setOpen}
      />
    </div>
  );
}
