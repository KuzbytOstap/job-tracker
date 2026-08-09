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
import { ApiError } from "@/lib/api";
import { AI_REQUEST_TYPE_LABELS } from "@/lib/admin-labels";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type DecisionNoteDialogProps = {
  request: AdminAiRequestDTO;
  decision: "APPROVED" | "REJECTED";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DecisionNoteDialog({ request, decision, open, onOpenChange }: DecisionNoteDialogProps) {
  const [note, setNote] = useState("");
  const mutation = useDecideAdminAiRequest();
  const isApprove = decision === "APPROVED";
  const userLabel = request.user.email ?? request.user.name ?? "this user";

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
          toast.success(isApprove ? "Request approved" : "Request rejected");
          handleOpenChange(false);
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Couldn't save this decision. Try again."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isApprove ? "Approve request" : "Reject request"}</DialogTitle>
          <DialogDescription>
            {AI_REQUEST_TYPE_LABELS[request.type]} request from {userLabel}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="decision-note">Decision note (optional)</FieldLabel>
            <Textarea
              id="decision-note"
              rows={3}
              autoFocus
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Visible to the user, if you choose to explain your decision."
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              variant={isApprove ? "default" : "destructive"}
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : isApprove ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
