"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useDeleteApplication } from "@/hooks/use-delete-application";
import type { ApplicationDTO } from "@/lib/api-types";

type DeleteApplicationDialogProps = {
  application: ApplicationDTO;
  onDeleted: () => void;
};

export function DeleteApplicationDialog({ application, onDeleted }: DeleteApplicationDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useDeleteApplication();

  function handleConfirm() {
    mutation.mutate(application.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success(`${application.company} — ${application.position} deleted`);
        onDeleted();
      },
    });
  }

  return (
    <div className="border-t border-border/60 pt-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 data-icon="inline-start" />
        Delete application
      </Button>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this application?"
        description={`This permanently deletes ${application.company} — ${application.position}. This can't be undone.`}
        confirmLabel="Delete"
        destructive
        visualVariant="gameHub"
        intent="destructive"
        pending={mutation.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
