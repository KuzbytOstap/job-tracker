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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDecideAdminAiRequest } from "@/hooks/use-decide-admin-ai-request";
import { ApiError } from "@/lib/api";
import { AI_REQUEST_TYPE_LABELS } from "@/lib/admin-labels";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type GrantAmountDialogProps = {
  request: AdminAiRequestDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GrantAmountDialog({ request, open, onOpenChange }: GrantAmountDialogProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const mutation = useDecideAdminAiRequest();

  const parsedAmount = Number(amount);
  const isValidAmount = amount.trim() !== "" && Number.isInteger(parsedAmount) && parsedAmount > 0;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAmount("");
      setNote("");
    }
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidAmount || mutation.isPending) return;

    mutation.mutate(
      {
        requestId: request.id,
        decision: "APPROVED",
        grantedAmount: parsedAmount,
        decisionNote: note.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Request approved");
          handleOpenChange(false);
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Couldn't approve the request. Try again."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve with custom amount</DialogTitle>
          <DialogDescription>
            Grants a one-time {AI_REQUEST_TYPE_LABELS[request.type]} bonus to{" "}
            {request.user.email ?? request.user.name ?? "this user"} for today only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="grant-amount">Amount</FieldLabel>
            <Input
              id="grant-amount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={amount !== "" && !isValidAmount}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="grant-note">Decision note (optional)</FieldLabel>
            <Textarea
              id="grant-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!isValidAmount || mutation.isPending} aria-busy={mutation.isPending}>
              {mutation.isPending ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
