"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useT } from "@/components/i18n/i18n-provider";
import { useDeleteApplication } from "@/hooks/use-delete-application";
import type { ApplicationDTO } from "@/lib/api-types";

type DeleteApplicationDialogProps = {
  application: ApplicationDTO;
  onDeleted: () => void;
};

export function DeleteApplicationDialog({ application, onDeleted }: DeleteApplicationDialogProps) {
  const t = useT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useDeleteApplication();

  function handleConfirm() {
    mutation.mutate(application.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success(t("dialogs.deleteApplication.deleted", { company: application.company, position: application.position }));
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
        {t("dialogs.deleteApplication.button")}
      </Button>
      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("dialogs.deleteApplication.title")}
        description={t("dialogs.deleteApplication.description", { company: application.company, position: application.position })}
        confirmLabel={t("dialogs.deleteApplication.confirm")}
        destructive
        visualVariant="gameHub"
        intent="destructive"
        pending={mutation.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
