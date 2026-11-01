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
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { AI_REQUEST_TYPE_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { useT } from "@/components/i18n/i18n-provider";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type GrantAmountDialogProps = {
  request: AdminAiRequestDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GrantAmountDialog({ request, open, onOpenChange }: GrantAmountDialogProps) {
  const t = useT();
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
          toast.success(t("admin.requests.toasts.approved"));
          handleOpenChange(false);
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(t, error, "admin.requests.toasts.approveFailed")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.requests.decision.grantTitle")}</DialogTitle>
          <DialogDescription>
            {t("admin.requests.decision.grantDescription", {
              type: t(AI_REQUEST_TYPE_LABEL_KEYS[request.type]),
              user: request.user.email ?? request.user.name ?? t("admin.requests.decision.thisUser"),
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="grant-amount">{t("admin.requests.decision.amount")}</FieldLabel>
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
            <FieldLabel htmlFor="grant-note">{t("admin.requests.decision.noteLabel")}</FieldLabel>
            <Textarea
              id="grant-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              {t("common.cancel")}
            </DialogClose>
            <Button type="submit" disabled={!isValidAmount || mutation.isPending} aria-busy={mutation.isPending}>
              {mutation.isPending ? t("admin.requests.approving") : t("admin.requests.approve")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
