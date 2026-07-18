"use client";

import { useState } from "react";
import { ResponsiveApplicationOverlay } from "@/components/overlay/responsive-application-overlay";
import { ApplicationCreateForm } from "@/components/applications/application-create-form";

type AddApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatusSlug?: string;
};

export function AddApplicationDialog({ open, onOpenChange, currentStatusSlug }: AddApplicationDialogProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, setIsPending] = useState(false);

  return (
    <ResponsiveApplicationOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Add application"
      description="Track a new job application. It starts in Applied."
      isDirty={isDirty}
      isPending={isPending}
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
