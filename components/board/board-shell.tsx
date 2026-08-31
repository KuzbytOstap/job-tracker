"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AppHeader } from "@/components/dashboard/app-header";
import { GameHubHero } from "@/components/dashboard/game-hub-hero";
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
import { FocusDock } from "@/components/dashboard/focus-dock";
import { PipelineTopbarActions } from "@/components/console/pipeline-topbar";
import { PipelineViewSwitcher, type ConsoleView } from "@/components/console/pipeline-view-switcher";
import { ConsoleTableView } from "@/components/console/console-table-view";
import { ConsoleFunnelView } from "@/components/console/console-funnel-view";
import { useApplicationsQuery } from "@/hooks/use-applications";
import { useStatsQuery } from "@/hooks/use-stats";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApplicationDetailState } from "@/hooks/use-application-detail";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { SortOption } from "@/lib/validation";

const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const;

type BoardShellProps = {
  isAdmin?: boolean;
};

export function BoardShell({ isAdmin = false }: BoardShellProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [consoleView, setConsoleView] = useState<ConsoleView>("board");
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const isConsoleDesktop = useMediaQuery("(min-width: 1280px)");
  const reducedMotion = useReducedMotion();

  const detail = useApplicationDetailState();

  const statsQuery = useStatsQuery();
  const applicationsQuery = useApplicationsQuery({ status: "ALL", sort, q: debouncedSearch });
  const applications = applicationsQuery.data?.applications ?? [];

  const hasPlayedBoardEntranceRef = useRef(false);
  const boardEntranceEligible = !hasPlayedBoardEntranceRef.current;
  useEffect(() => {
    if (!applicationsQuery.isPending && applications.length > 0) {
      hasPlayedBoardEntranceRef.current = true;
    }
  }, [applicationsQuery.isPending, applications.length]);

  const entranceInitial = reducedMotion ? false : { opacity: 0, y: -10 };

  return (
    <>
      <h1 className="sr-only hidden xl:block">Job Tracker pipeline board</h1>

      <div
        aria-hidden
        className="pointer-events-none fixed top-[-160px] left-1/2 -z-10 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl sm:hidden"
      />

      <AppHeader
        total={statsQuery.data?.total}
        onAddClick={() => setAddDialogOpen(true)}
        playEntrance={!reducedMotion}
        isAdmin={isAdmin}
        className="xl:hidden"
      />

      <motion.div
        initial={entranceInitial}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: ENTRANCE_EASE, delay: reducedMotion ? 0 : 0.04 }}
        className="xl:hidden"
      >
        <GameHubHero
          applications={applications.map((application) => ({
            id: application.id,
            status: application.status,
          }))}
          isLoading={applicationsQuery.isPending}
        />
      </motion.div>

      <motion.div
        initial={entranceInitial}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: ENTRANCE_EASE, delay: reducedMotion ? 0 : 0.1 }}
        className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 sm:rounded-xl sm:border sm:border-[var(--gh-border)] sm:bg-[var(--gh-surface)] sm:py-3 sm:mt-4 sm:shadow-[var(--gh-shadow)] xl:mx-0 xl:mt-0 xl:flex xl:max-w-none xl:shrink-0 xl:items-center xl:gap-3 xl:rounded-none xl:border-t-0 xl:border-x-0 xl:border-b xl:border-[var(--gh-border)] xl:bg-[var(--gh-surface)] xl:px-6 xl:py-3 xl:shadow-none"
      >
        <div className="xl:min-w-0 xl:max-w-xl xl:flex-1">
          <DashboardControls
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
          />
        </div>
        <div className="hidden xl:flex">
          <PipelineViewSwitcher view={consoleView} onViewChange={setConsoleView} />
        </div>
        <div className="hidden xl:flex">
          <PipelineTopbarActions onAddClick={() => setAddDialogOpen(true)} />
        </div>
      </motion.div>

      <div className="sm:hidden">
        <BoardStats />
      </div>

      <div className="pt-4 pb-24 sm:pb-16 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pt-4 xl:pb-6">
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
          <div className="flex items-start">
            <div className="min-w-0 flex-1">
              <KanbanDndContext>
                {isConsoleDesktop && consoleView === "table" ? (
                  <ConsoleTableView
                    applications={applications}
                    onSelectApplication={(application) => detail.openDetail(application.id)}
                  />
                ) : isConsoleDesktop && consoleView === "funnel" ? (
                  <ConsoleFunnelView
                    stats={statsQuery.data}
                    isLoading={statsQuery.isPending}
                    isError={statsQuery.isError}
                    onRetry={() => statsQuery.refetch()}
                  />
                ) : (
                  <KanbanBoard
                    applications={applications}
                    sort={sort}
                    onSelectApplication={(application) => detail.openDetail(application.id)}
                    playEntrance={boardEntranceEligible}
                  />
                )}
              </KanbanDndContext>
            </div>
            <FocusDock
              applications={applications}
              isLoading={applicationsQuery.isPending}
              detailOpen={detail.open}
              onSelectApplication={(id) => detail.openDetail(id)}
              className="xl:hidden"
            />
          </div>
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
    </>
  );
}
