"use client";

import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useT } from "@/components/i18n/i18n-provider";

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDiscard: () => void;
  visualVariant?: "default" | "gameHub";
};

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirmDiscard,
  visualVariant = "default",
}: UnsavedChangesDialogProps) {
  const t = useT();

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("dialogs.unsaved.title")}
      description={t("dialogs.unsaved.description")}
      confirmLabel={t("dialogs.unsaved.confirm")}
      cancelLabel={t("dialogs.unsaved.cancel")}
      destructive
      visualVariant={visualVariant}
      intent="warning"
      onConfirm={onConfirmDiscard}
    />
  );
}
