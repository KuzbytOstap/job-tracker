"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type CollisionDetection,
  type Over,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useApplicationDragAndDrop } from "@/hooks/use-application-drag-and-drop";
import { ApplicationDragOverlay } from "@/components/board/application-drag-overlay";
import { PendingDropConfirmation } from "@/components/board/pending-drop-confirmation";
import { BOARD_COLUMNS_BY_STATUS } from "@/lib/board-columns";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { Status } from "@/app/generated/prisma/enums";

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

function describeActive(active: Active): string {
  const application = active.data.current?.application as ApplicationListItemDTO | undefined;
  return application ? `${application.company} — ${application.position}` : "the application";
}

function describeColumn(over: Over | null): string | undefined {
  const status = over?.data.current?.status as Status | undefined;
  return status ? BOARD_COLUMNS_BY_STATUS[status].label : undefined;
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Press space or enter to pick up an application card. While dragging, use the arrow keys to move it to another status column, press space or enter to drop it there, or press escape to cancel.",
};

const announcements: Announcements = {
  onDragStart({ active }) {
    return `Picked up ${describeActive(active)}.`;
  },
  onDragOver({ active, over }) {
    const column = describeColumn(over);
    return column ? `${describeActive(active)} is over the ${column} column.` : undefined;
  },
  onDragEnd({ active, over }) {
    const column = describeColumn(over);
    return column
      ? `Dropped ${describeActive(active)} on the ${column} column.`
      : `${describeActive(active)} was dropped outside any column. No change was made.`;
  },
  onDragCancel({ active }) {
    return `Moving ${describeActive(active)} was cancelled.`;
  },
};

type KanbanDndContextProps = {
  children: ReactNode;
};

export function KanbanDndContext({ children }: KanbanDndContextProps) {
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } });
  const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const {
    activeApplication,
    pendingDrop,
    isPending,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    confirmPendingDrop,
    cancelPendingDrop,
  } = useApplicationDragAndDrop();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <ApplicationDragOverlay application={activeApplication} />
      <PendingDropConfirmation
        pendingDrop={pendingDrop}
        pending={isPending}
        onConfirm={confirmPendingDrop}
        onCancel={cancelPendingDrop}
      />
    </DndContext>
  );
}
