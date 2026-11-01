"use client";

import { useState } from "react";
import { ResponsiveApplicationOverlay } from "@/components/overlay/responsive-application-overlay";
import { ApplicationCreateForm } from "@/components/applications/application-create-form";
import { useT } from "@/components/i18n/i18n-provider";

type AddApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatusSlug?: string;
};

export function AddApplicationDialog({ open, onOpenChange, currentStatusSlug }: AddApplicationDialogProps) {
  const t = useT();
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, setIsPending] = useState(false);

  return (
    <ResponsiveApplicationOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={t("form.addTitle")}
      description={t("form.addDescription")}
      isDirty={isDirty}
      isPending={isPending}
      mobileFullScreen
      desktopPresentation="workspace-dialog"
    >
      <ApplicationCreateForm
        currentStatusSlug={currentStatusSlug}
        onCreated={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
        onDirtyChange={setIsDirty}
        onPendingChange={setIsPending}
      />
    </ResponsiveApplicationOverlay>
  );
}
