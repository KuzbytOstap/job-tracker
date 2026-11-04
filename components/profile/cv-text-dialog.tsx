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
import { useT } from "@/components/i18n/i18n-provider";
import { useSetCvText } from "@/hooks/use-set-cv-text";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { CvDTO } from "@/lib/api-types";
import { CV_TEXT_MAX_LENGTH } from "@/lib/profile/limits";
import { skipReasonMessageKey } from "@/lib/profile/skip-reasons";

type CvTextDialogProps = {
  cv: CvDTO;
  reason: string | null;
  onClose: () => void;
};

export function CvTextDialog({ cv, reason, onClose }: CvTextDialogProps) {
  const t = useT();
  const mutation = useSetCvText();
  const [text, setText] = useState("");
  const canSubmit = text.trim() !== "" && !mutation.isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    mutation.mutate(
      { id: cv.id, text: text.trim() },
      {
        onSuccess: () => {
          toast.success(t("profile.cv.textSaved"));
          onClose();
        },
        onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.cv.textSaveFailed")),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.cv.textMissingTitle")}</DialogTitle>
          <DialogDescription>{t("profile.cv.textMissingBody")}</DialogDescription>
        </DialogHeader>
        {reason !== null ? (
          <p className="text-sm text-[var(--gh-text-muted)]">{t(skipReasonMessageKey(reason))}</p>
        ) : null}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="profile-cv-text">{t("profile.cv.textLabel")}</FieldLabel>
            <Textarea
              id="profile-cv-text"
              value={text}
              rows={10}
              maxLength={CV_TEXT_MAX_LENGTH}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              {t("common.cancel")}
            </DialogClose>
            <Button type="submit" disabled={!canSubmit} aria-busy={mutation.isPending}>
              {mutation.isPending ? t("common.saving") : t("profile.cv.saveText")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
