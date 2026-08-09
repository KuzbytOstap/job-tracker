"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ApplicationCard } from "@/components/dashboard/application-card";
import { ApplicationDragHandle } from "@/components/board/application-drag-handle";
import { cn } from "@/lib/utils";
import type { ApplicationListItemDTO } from "@/lib/api-types";

type DraggableApplicationCardProps = {
  application: ApplicationListItemDTO;
  onSelect: (application: ApplicationListItemDTO) => void;
};

export function DraggableApplicationCard({ application, onSelect }: DraggableApplicationCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { application },
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      data-dragging={isDragging ? "true" : undefined}
      className={cn("kanban-drag-source relative", isDragging && "z-10 scale-[0.97] opacity-55")}
    >
      <ApplicationCard
        application={application}
        onSelect={onSelect}
        visualVariant="gameHub"
        dragHandle={
          <ApplicationDragHandle
            company={application.company}
            attributes={attributes}
            listeners={listeners}
          />
        }
      />
    </div>
  );
}
