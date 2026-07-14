"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApplicationDetailSkeleton } from "@/components/applications/application-detail-skeleton";
import { ApplicationDetailView } from "@/components/applications/application-detail-view";
import { ApplicationEditForm } from "@/components/applications/application-edit-form";
import { useApplicationQuery } from "@/hooks/use-application";

type ApplicationDetailProps = {
  applicationId: string;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
};

export function ApplicationDetail({
  applicationId,
  onClose,
  onDirtyChange,
  onPendingChange,
}: ApplicationDetailProps) {
  const query = useApplicationQuery(applicationId);
  const [mode, setMode] = useState<"view" | "edit">("view");

  useEffect(() => {
    setMode("view");
  }, [applicationId]);

  useEffect(() => {
    if (mode === "view") {
      onDirtyChange(false);
      onPendingChange(false);
    }
  }, [mode, onDirtyChange, onPendingChange]);

  if (query.isPending) {
    return <ApplicationDetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this application.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const application = query.data;

  if (mode === "edit") {
    return (
      <ApplicationEditForm
        application={application}
        onSaved={() => setMode("view")}
        onCancel={() => setMode("view")}
        onDirtyChange={onDirtyChange}
        onPendingChange={onPendingChange}
      />
    );
  }

  return <ApplicationDetailView application={application} onEdit={() => setMode("edit")} onDeleted={onClose} />;
}
