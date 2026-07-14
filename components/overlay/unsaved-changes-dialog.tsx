"use client";

import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDiscard: () => void;
};

export function UnsavedChangesDialog({ open, onOpenChange, onConfirmDiscard }: UnsavedChangesDialogProps) {
  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Discard unsaved changes?"
      description="You have unsaved changes. If you close now, they will be lost."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      destructive
      onConfirm={onConfirmDiscard}
    />
  );
}
