"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useMoveApplicationToStatus } from "@/hooks/use-move-application-to-status";
import { decideDropTransition } from "@/lib/drag-drop-transitions";
import { useT } from "@/components/i18n/i18n-provider";
import { STATUS_LABEL_KEYS } from "@/lib/i18n/label-keys";
import type { ApplicationListItemDTO } from "@/lib/api-types";
import type { Status } from "@/app/generated/prisma/enums";

export type PendingDrop = {
  applicationId: string;
  company: string;
  position: string;
  targetStatus: Status;
};

function readApplication(data: Record<string, unknown> | undefined): ApplicationListItemDTO | undefined {
  return data?.application as ApplicationListItemDTO | undefined;
}

function readColumnStatus(data: Record<string, unknown> | undefined): Status | undefined {
  return data?.status as Status | undefined;
}

/**
 * Owns drag state and drop decisions for the root Kanban board. Every actual
 * status change — immediate or confirmed — goes through the shared
 * useMoveApplicationToStatus mutation, so optimistic updates, rollback, and
 * cache sync all come from that existing boundary.
 */
export function useApplicationDragAndDrop() {
  const moveMutation = useMoveApplicationToStatus();
  const t = useT();
  const [activeApplication, setActiveApplication] = useState<ApplicationListItemDTO | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveApplication(readApplication(event.active.data.current) ?? null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveApplication(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveApplication(null);

      const application = readApplication(event.active.data.current);
      const targetStatus = event.over ? readColumnStatus(event.over.data.current) : undefined;
      if (!application || !targetStatus) return;

      const decision = decideDropTransition(application, targetStatus);
      if (decision === "noop") return;

      if (decision === "confirm") {
        setPendingDrop({
          applicationId: application.id,
          company: application.company,
          position: application.position,
          targetStatus,
        });
        return;
      }

      moveMutation.mutate(
        { applicationId: application.id, targetStatus },
        { onSuccess: () => toast.success(t("pipeline.movedTo", { status: t(STATUS_LABEL_KEYS[targetStatus]) })) },
      );
    },
    [moveMutation, t],
  );

  const confirmPendingDrop = useCallback(() => {
    if (!pendingDrop) return;
    moveMutation.mutate(
      { applicationId: pendingDrop.applicationId, targetStatus: pendingDrop.targetStatus },
      {
        onSuccess: () => {
          toast.success(t("pipeline.movedTo", { status: t(STATUS_LABEL_KEYS[pendingDrop.targetStatus]) }));
          setPendingDrop(null);
        },
      },
    );
  }, [moveMutation, pendingDrop, t]);

  const cancelPendingDrop = useCallback(() => {
    setPendingDrop(null);
  }, []);

  return {
    activeApplication,
    pendingDrop,
    isPending: moveMutation.isPending,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    confirmPendingDrop,
    cancelPendingDrop,
  };
}
