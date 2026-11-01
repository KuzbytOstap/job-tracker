"use client";

import { useState } from "react";
import { ResponsiveApplicationOverlay } from "@/components/overlay/responsive-application-overlay";
import { ApplicationDetail } from "@/components/applications/application-detail";
import { useT } from "@/components/i18n/i18n-provider";

type ApplicationDetailDialogProps = {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApplicationDetailDialog({ applicationId, open, onOpenChange }: ApplicationDetailDialogProps) {
  const t = useT();
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, setIsPending] = useState(false);

  return (
    <ResponsiveApplicationOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={t("detail.title")}
      isDirty={isDirty}
      isPending={isPending}
      desktopPresentation="side-panel"
    >
      {applicationId && (
        <ApplicationDetail
          applicationId={applicationId}
          onClose={() => onOpenChange(false)}
          onDirtyChange={setIsDirty}
          onPendingChange={setIsPending}
        />
      )}
    </ResponsiveApplicationOverlay>
  );
}
