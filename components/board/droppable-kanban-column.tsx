"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { KanbanColumn } from "@/components/board/kanban-column";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { SortOption } from "@/lib/validation";
import type { Status } from "@/app/generated/prisma/enums";

type DroppableKanbanColumnProps = {
  status: Status;
  applications: ApplicationListItemDTO[];
  sort: SortOption;
  onSelectApplication: (application: ApplicationListItemDTO) => void;
};

export function DroppableKanbanColumn({
  status,
  applications,
  sort,
  onSelectApplication,
}: DroppableKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } });
  const { active } = useDndContext();
  const activeApplication = active?.data.current?.application as ApplicationListItemDTO | undefined;
  const isDragSource = activeApplication !== undefined && activeApplication.effectiveStatus === status;

  return (
    <KanbanColumn
      status={status}
      applications={applications}
      sort={sort}
      onSelectApplication={onSelectApplication}
      dropRef={setNodeRef}
      isDropTarget={isOver}
      isDragSource={isDragSource}
    />
  );
}
