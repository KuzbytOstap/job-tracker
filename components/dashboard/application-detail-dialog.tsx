"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlatformBadge } from "@/components/dashboard/platform-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { ApplicationDTO } from "@/lib/api-types";

type ApplicationDetailDialogProps = {
  application: ApplicationDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApplicationDetailDialog({
  application,
  open,
  onOpenChange,
}: ApplicationDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {application && (
          <>
            <DialogHeader>
              <DialogTitle>{application.company}</DialogTitle>
              <DialogDescription>{application.position}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-1.5">
              <PlatformBadge platform={application.platform} />
              <StatusBadge status={application.effectiveStatus} />
            </div>
            <p className="text-sm text-muted-foreground">
              Full editing tools are coming soon. For now this confirms which application you
              selected.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
