"use client";

import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useT } from "@/components/i18n/i18n-provider";
import { STATUS_LABEL_KEYS } from "@/lib/i18n/label-keys";
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
  const t = useT();
  const label = pendingDrop ? t(STATUS_LABEL_KEYS[pendingDrop.targetStatus]) : "";
  const subject = pendingDrop ? `${pendingDrop.company}, ${pendingDrop.position}` : "";
  const isReject = pendingDrop?.targetStatus === Status.REJECTED;

  return (
    <ConfirmActionDialog
      open={pendingDrop !== null}
      onOpenChange={(open) => !open && onCancel()}
      title={t("dnd.moveTitle", { status: label })}
      description={t("dnd.moveDescription", { subject, status: label })}
      confirmLabel={t("dnd.move")}
      destructive={isReject}
      visualVariant="gameHub"
      intent={isReject ? "warning" : "neutral"}
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}
