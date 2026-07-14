"use client";

import { KanbanColumn } from "@/components/board/kanban-column";
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
    <div className="w-full overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin]">
      <div
        className="flex w-max snap-x snap-mandatory gap-4 sm:snap-none"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {columns.map(({ status, applications: columnApplications }) => (
          <KanbanColumn
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
