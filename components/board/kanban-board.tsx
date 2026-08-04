"use client";

import { motion, useReducedMotion } from "motion/react";
import { DroppableKanbanColumn } from "@/components/board/droppable-kanban-column";
import { distributeApplicationsIntoColumns } from "@/lib/board-columns";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";

type KanbanBoardProps = {
  applications: ApplicationListItemDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
  playEntrance?: boolean;
};

export function KanbanBoard({
  applications,
  sort,
  onSelectApplication,
  playEntrance = false,
}: KanbanBoardProps) {
  const columns = distributeApplicationsIntoColumns(applications);
  const reducedMotion = useReducedMotion();
  const animateEntrance = playEntrance && !reducedMotion;

  return (
    <div className="mx-auto w-full max-w-[1600px] overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin]">
      <div className="flex w-max snap-x snap-mandatory items-start gap-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:snap-none sm:gap-5 sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
        {columns.map(({ status, applications: columnApplications }, index) => (
          <motion.div
            key={status}
            className="shrink-0"
            initial={animateEntrance ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1],
              delay: animateEntrance ? Math.min(index * 0.045, 0.18) : 0,
            }}
          >
            <DroppableKanbanColumn
              status={status}
              applications={columnApplications}
              sort={sort}
              onSelectApplication={onSelectApplication}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
