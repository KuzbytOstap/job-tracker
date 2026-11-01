"use client";

import { useMemo, type ReactNode } from "react";
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
import { useT } from "@/components/i18n/i18n-provider";
import { STATUS_LABEL_KEYS } from "@/lib/i18n/label-keys";
import type { Translator } from "@/lib/i18n/translate";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { Status } from "@/app/generated/prisma/enums";

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

function describeActive(active: Active, t: Translator): string {
  const application = active.data.current?.application as ApplicationListItemDTO | undefined;
  return application ? `${application.company}, ${application.position}` : t("dnd.theApplication");
}

function describeColumn(over: Over | null, t: Translator): string | undefined {
  const status = over?.data.current?.status as Status | undefined;
  return status ? t(STATUS_LABEL_KEYS[status]) : undefined;
}

function buildAnnouncements(t: Translator): Announcements {
  return {
    onDragStart({ active }) {
      return t("dnd.pickedUp", { subject: describeActive(active, t) });
    },
    onDragOver({ active, over }) {
      const column = describeColumn(over, t);
      return column ? t("dnd.over", { subject: describeActive(active, t), column }) : undefined;
    },
    onDragEnd({ active, over }) {
      const column = describeColumn(over, t);
      const subject = describeActive(active, t);
      return column ? t("dnd.dropped", { subject, column }) : t("dnd.droppedOutside", { subject });
    },
    onDragCancel({ active }) {
      return t("dnd.cancelled", { subject: describeActive(active, t) });
    },
  };
}

type KanbanDndContextProps = {
  children: ReactNode;
};

export function KanbanDndContext({ children }: KanbanDndContextProps) {
  const t = useT();
  const announcements = useMemo(() => buildAnnouncements(t), [t]);
  const screenReaderInstructions = useMemo<ScreenReaderInstructions>(
    () => ({ draggable: t("dnd.instructions") }),
    [t],
  );
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
