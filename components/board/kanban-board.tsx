"use client";

import { DroppableKanbanColumn } from "@/components/board/droppable-kanban-column";
import { distributeApplicationsIntoColumns } from "@/lib/board-columns";
import type { ApplicationDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";

type KanbanBoardProps = {
  applications: ApplicationDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationDTO) => void;
};

export function KanbanBoard({ applications, sort, onSelectApplication }: KanbanBoardProps) {
  const columns = distributeApplicationsIntoColumns(applications);

  return (
    <div className="mx-auto w-full max-w-[1600px] overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin]">
      <div className="flex w-max snap-x snap-mandatory gap-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:snap-none sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
        {columns.map(({ status, applications: columnApplications }) => (
          <DroppableKanbanColumn
            key={status}
            status={status}
            applications={columnApplications}
            sort={sort}
            onSelectApplication={onSelectApplication}
          />
        ))}
      </div>
    </div>
  );
}
