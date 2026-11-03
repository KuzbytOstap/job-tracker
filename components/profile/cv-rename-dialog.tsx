"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n/i18n-provider";
import { useUpdateCv } from "@/hooks/use-update-cv";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { CvDTO } from "@/lib/api-types";
import { CV_LABEL_MAX_LENGTH, CV_LANGUAGE_MAX_LENGTH } from "@/lib/profile/limits";

type CvRenameDialogProps = {
  cv: CvDTO;
  onClose: () => void;
};

export function CvRenameDialog({ cv, onClose }: CvRenameDialogProps) {
  const t = useT();
  const mutation = useUpdateCv();
  const [label, setLabel] = useState(cv.label);
  const [language, setLanguage] = useState(cv.language ?? "");
  const canSubmit = label.trim() !== "" && !mutation.isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    mutation.mutate(
      { id: cv.id, payload: { label: label.trim(), language: language.trim() === "" ? null : language.trim() } },
      {
        onSuccess: () => {
          toast.success(t("profile.cv.updated"));
          onClose();
        },
        onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.cv.updateFailed")),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.cv.renameTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="profile-cv-rename-label">{t("profile.cv.label")}</FieldLabel>
            <Input
              id="profile-cv-rename-label"
              value={label}
              maxLength={CV_LABEL_MAX_LENGTH}
              autoComplete="off"
              className="h-11 sm:h-9"
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-cv-rename-language">{t("profile.cv.language")}</FieldLabel>
            <Input
              id="profile-cv-rename-language"
              value={language}
              maxLength={CV_LANGUAGE_MAX_LENGTH}
              autoComplete="off"
              className="h-11 sm:h-9"
              onChange={(event) => setLanguage(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              {t("common.cancel")}
            </DialogClose>
            <Button type="submit" disabled={!canSubmit} aria-busy={mutation.isPending}>
              {mutation.isPending ? t("common.saving") : t("profile.cv.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
