"use client";

import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { STATUS_LABELS } from "@/lib/labels";
import { Status } from "@/app/generated/prisma/enums";
import type { PendingDrop } from "@/hooks/use-application-drag-and-drop";

type PendingDropConfirmationProps = {
  pendingDrop: PendingDrop | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PendingDropConfirmation({
  pendingDrop,
  pending,
  onConfirm,
  onCancel,
}: PendingDropConfirmationProps) {
  const label = pendingDrop ? STATUS_LABELS[pendingDrop.targetStatus] : "";
  const subject = pendingDrop ? `${pendingDrop.company} — ${pendingDrop.position}` : "";

  return (
    <ConfirmActionDialog
      open={pendingDrop !== null}
      onOpenChange={(open) => !open && onCancel()}
      title={`Move to ${label}?`}
      description={`${subject} will be moved to ${label}.`}
      confirmLabel="Move"
      destructive={pendingDrop?.targetStatus === Status.REJECTED}
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
