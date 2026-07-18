"use client";

import { AnimatePresence } from "motion/react";
import { DateGroupSection } from "@/components/dashboard/date-group-section";
import { BoardColumnEmptyState } from "@/components/board/board-column-empty-state";
import { groupApplicationsByAppliedDate } from "@/lib/date-grouping";
import type { BoardColumnConfig } from "@/lib/board-columns";
import type { ApplicationDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";

type KanbanColumnContentProps = {
  column: BoardColumnConfig;
  applications: ApplicationDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationDTO) => void;
};

export function KanbanColumnContent({
  column,
  applications,
  sort,
  onSelectApplication,
}: KanbanColumnContentProps) {
  const groups = groupApplicationsByAppliedDate(applications, sort);

  return (
    <div className="px-3 pb-3">
      {groups.length === 0 ? (
        <BoardColumnEmptyState column={column} />
      ) : (
        <div className="flex flex-col gap-5">
          <AnimatePresence initial={false}>
            {groups.map((group) => (
              <DateGroupSection
                key={group.key}
                group={group}
                onSelectApplication={onSelectApplication}
                enableDrag
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
