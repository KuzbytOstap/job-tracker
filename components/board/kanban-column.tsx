import { KanbanColumnHeader } from "@/components/board/kanban-column-header";
import { KanbanColumnContent } from "@/components/board/kanban-column-content";
import { BOARD_COLUMNS_BY_STATUS } from "@/lib/board-columns";
import type { ApplicationDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";
import type { Status } from "@/app/generated/prisma/enums";

type KanbanColumnProps = {
  status: Status;
  applications: ApplicationDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationDTO) => void;
};

export function KanbanColumn({ status, applications, sort, onSelectApplication }: KanbanColumnProps) {
  const column = BOARD_COLUMNS_BY_STATUS[status];

  return (
    <section
      aria-label={`${column.label} column`}
      className="flex h-[calc(100dvh-260px)] min-h-[360px] w-[85vw] max-w-[340px] shrink-0 snap-start flex-col rounded-xl bg-muted/40 sm:w-[300px] sm:snap-align-none"
    >
      <KanbanColumnHeader column={column} count={applications.length} />
      <KanbanColumnContent
        column={column}
        applications={applications}
        sort={sort}
        onSelectApplication={onSelectApplication}
      />
    </section>
  );
}
