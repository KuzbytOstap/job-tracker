"use client";

import type { KeyboardEvent } from "react";
import { GripVertical } from "lucide-react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type ApplicationDragHandleProps = {
  company: string;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  className?: string;
};

export function ApplicationDragHandle({
  company,
  attributes,
  listeners,
  className,
}: ApplicationDragHandleProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    listeners?.onKeyDown?.(event);
    event.stopPropagation();
  }

  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
      aria-label={`Move ${company} application`}
      className={cn(
        "flex size-8 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing",
        "cursor-grab",
        className,
      )}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}
