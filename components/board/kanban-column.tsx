import { KanbanColumnHeader } from "@/components/board/kanban-column-header";
import { KanbanColumnContent } from "@/components/board/kanban-column-content";
import { BOARD_COLUMNS_BY_STATUS } from "@/lib/board-columns";
import { cn } from "@/lib/utils";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";
import type { Status } from "@/app/generated/prisma/enums";

type KanbanColumnProps = {
  status: Status;
  applications: ApplicationListItemDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
  dropRef?: (node: HTMLElement | null) => void;
  isDropTarget?: boolean;
  isDragSource?: boolean;
};

export function KanbanColumn({
  status,
  applications,
  sort,
  onSelectApplication,
  dropRef,
  isDropTarget,
  isDragSource,
}: KanbanColumnProps) {
  const column = BOARD_COLUMNS_BY_STATUS[status];

  return (
    <section
      ref={dropRef}
      aria-label={`${column.label} column`}
      className={cn(
        "flex min-h-[360px] w-[85vw] max-w-[340px] shrink-0 snap-start flex-col rounded-xl bg-muted/40 transition-colors sm:w-[300px] sm:snap-align-none",
        isDropTarget && "bg-primary/5 ring-2 ring-primary",
        isDragSource && !isDropTarget && "bg-muted/60",
      )}
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
