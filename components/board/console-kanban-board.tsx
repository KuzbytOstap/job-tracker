"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DroppableKanbanColumn } from "@/components/board/droppable-kanban-column";
import { cn } from "@/lib/utils";
import type { BoardColumnBucket } from "@/lib/board-columns";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";

type ConsoleKanbanBoardProps = {
  activeColumns: BoardColumnBucket<ApplicationListItemDTO>[];
  closedColumns: BoardColumnBucket<ApplicationListItemDTO>[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
  playEntrance?: boolean;
};

export function ConsoleKanbanBoard({
  activeColumns,
  closedColumns,
  sort,
  onSelectApplication,
  playEntrance = false,
}: ConsoleKanbanBoardProps) {
  const [closedOpen, setClosedOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const animateEntrance = playEntrance && !reducedMotion;
  const closedCount = closedColumns.reduce((sum, bucket) => sum + bucket.applications.length, 0);

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 sm:px-6">
      <div className="grid grid-cols-6 items-start gap-2.5">
        {activeColumns.map(({ status, applications }, index) => (
          <motion.div
            key={status}
            initial={animateEntrance ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1],
              delay: animateEntrance ? Math.min(index * 0.045, 0.18) : 0,
            }}
            className="min-w-0"
          >
            <DroppableKanbanColumn
              status={status}
              applications={applications}
              sort={sort}
              onSelectApplication={onSelectApplication}
              variant="console"
            />
          </motion.div>
        ))}
      </div>

      <Collapsible open={closedOpen} onOpenChange={setClosedOpen}>
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface-secondary)] px-3.5 text-sm font-medium text-[var(--gh-text-secondary)] transition-colors hover:text-[var(--gh-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <span>Closed applications</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs tabular-nums text-[var(--gh-text-muted)]">{closedCount}</span>
            <ChevronDown
              aria-hidden
              className={cn("size-4 transition-transform duration-200", closedOpen && "rotate-180")}
            />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none data-[ending-style]:h-0 data-[starting-style]:h-0">
          {closedOpen && (
            <div className="grid grid-cols-2 gap-2.5 pt-3">
              {closedColumns.map(({ status, applications }) => (
                <DroppableKanbanColumn
                  key={status}
                  status={status}
                  applications={applications}
                  sort={sort}
                  onSelectApplication={onSelectApplication}
                  variant="console"
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
