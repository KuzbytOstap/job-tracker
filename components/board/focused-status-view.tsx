"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { AppHeader } from "@/components/dashboard/app-header";
import { ApplicationsView } from "@/components/dashboard/applications-view";
import { FloatingAddButton } from "@/components/dashboard/floating-add-button";
import { AddApplicationDialog } from "@/components/dashboard/add-application-dialog";
import { ApplicationDetailDialog } from "@/components/dashboard/application-detail-dialog";
import { useApplicationsQuery } from "@/hooks/use-applications";
import { useStatsQuery } from "@/hooks/use-stats";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useApplicationDetailState } from "@/hooks/use-application-detail";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { getBoardColumnBySlug } from "@/lib/board-columns";
import type { SortOption } from "@/lib/validation";

const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const;

type FocusedStatusViewProps = {
  slug: string;
};

export function FocusedStatusView({ slug }: FocusedStatusViewProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const reducedMotion = useReducedMotion();

  const detail = useApplicationDetailState();
  const statsQuery = useStatsQuery();

  const column = getBoardColumnBySlug(slug);
  const applicationsQuery = useApplicationsQuery({
    status: column?.status,
    sort,
    q: debouncedSearch,
  });

  if (!column) {
    return null;
  }

  const Icon = column.icon;
  const count = applicationsQuery.data?.total ?? statsQuery.data?.counts[column.status];
  const listVariant = isDesktop ? "gameHub" : "default";
  const headerEntranceInitial = reducedMotion ? false : { opacity: 0, y: -6 };

  return (
    <div
      data-job-tracker-theme="game-hub"
      className="relative min-h-screen overflow-x-clip bg-background sm:bg-[var(--gh-bg)]"
    >
      <div
        aria-hidden
        className="pointer-events-none fixed top-[-160px] left-1/2 -z-10 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <AppHeader total={statsQuery.data?.total} onAddClick={() => setAddDialogOpen(true)} />

      <div className="mx-auto w-full max-w-[760px] px-4 pt-4 pb-24 sm:max-w-[960px] sm:px-6 sm:pb-16">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 rounded-md py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to board
        </Link>

        <motion.div
          initial={headerEntranceInitial}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: ENTRANCE_EASE }}
          data-status={column.status}
          className="gh-stage-header mb-4 flex items-center gap-2 sm:mb-6"
        >
          <span className={cn("size-2.5 shrink-0 rounded-full", column.dotClassName)} />
          <Icon className="size-5 shrink-0 text-muted-foreground sm:text-[var(--gh-accent-secondary)]" />
          <h1 className="font-heading text-lg font-semibold tracking-tight sm:text-xl sm:text-[var(--gh-text)]">
            {column.label}
          </h1>
          {typeof count === "number" && (
            <span className="text-sm text-muted-foreground sm:text-[var(--gh-text-muted)]">
              · {count} application{count === 1 ? "" : "s"}
            </span>
          )}
        </motion.div>

        <ApplicationsView
          status={column.status}
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
          debouncedSearch={debouncedSearch}
          onSelectApplication={(application) => detail.openDetail(application.id)}
          onAddClick={() => setAddDialogOpen(true)}
          visualVariant={listVariant}
        />
      </div>

      <FloatingAddButton onClick={() => setAddDialogOpen(true)} />

      <AddApplicationDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} currentStatusSlug={column.slug} />
      <ApplicationDetailDialog
        applicationId={detail.selectedApplicationId}
        open={detail.open}
        onOpenChange={detail.setOpen}
      />
    </div>
  );
}
