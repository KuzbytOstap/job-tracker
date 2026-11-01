"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useDecideAdminAiRequest } from "@/hooks/use-decide-admin-ai-request";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { AI_REQUEST_TYPE_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { useT } from "@/components/i18n/i18n-provider";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type DecisionNoteDialogProps = {
  request: AdminAiRequestDTO;
  decision: "APPROVED" | "REJECTED";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DecisionNoteDialog({ request, decision, open, onOpenChange }: DecisionNoteDialogProps) {
  const t = useT();
  const [note, setNote] = useState("");
  const mutation = useDecideAdminAiRequest();
  const isApprove = decision === "APPROVED";
  const userLabel = request.user.email ?? request.user.name ?? t("admin.requests.decision.thisUser");

  function handleOpenChange(next: boolean) {
    if (!next) setNote("");
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;

    mutation.mutate(
      { requestId: request.id, decision, decisionNote: note.trim() || null },
      {
        onSuccess: () => {
          toast.success(isApprove ? t("admin.requests.toasts.approved") : t("admin.requests.toasts.rejected"));
          handleOpenChange(false);
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(t, error, "admin.requests.toasts.decisionFailed")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isApprove ? t("admin.requests.decision.approveTitle") : t("admin.requests.decision.rejectTitle")}</DialogTitle>
          <DialogDescription>
            {t("admin.requests.decision.description", { type: t(AI_REQUEST_TYPE_LABEL_KEYS[request.type]), user: userLabel })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="decision-note">{t("admin.requests.decision.noteLabel")}</FieldLabel>
            <Textarea
              id="decision-note"
              rows={3}
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("admin.requests.decision.notePlaceholder")}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              {t("common.cancel")}
            </DialogClose>
            <Button
              type="submit"
              variant={isApprove ? "default" : "destructive"}
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending ? t("common.saving") : isApprove ? t("admin.requests.approve") : t("admin.requests.reject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
