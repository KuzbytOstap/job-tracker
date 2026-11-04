"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n/i18n-provider";
import { useUploadCv } from "@/hooks/use-upload-cv";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { MessageKey } from "@/lib/i18n/messages";
import type { CvUploadResultDTO } from "@/lib/api-types";
import { CV_LABEL_MAX_LENGTH, CV_LANGUAGE_MAX_LENGTH, CV_MAX_COUNT } from "@/lib/profile/limits";
import { checkPdfFile } from "@/lib/profile/pdf-file";

type CvUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (result: CvUploadResultDTO) => void;
};

export function CvUploadDialog({ open, onOpenChange, onImported }: CvUploadDialogProps) {
  const t = useT();
  const mutation = useUploadCv();
  const [label, setLabel] = useState("");
  const [language, setLanguage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileErrorKey, setFileErrorKey] = useState<MessageKey | null>(null);

  const canSubmit = label.trim() !== "" && file !== null && fileErrorKey === null && !mutation.isPending;

  function resetForm() {
    setLabel("");
    setLanguage("");
    setFile(null);
    setFileErrorKey(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    const problem = next ? checkPdfFile(next) : null;
    setFileErrorKey(
      problem === "tooLarge" ? "profile.cv.fileTooLarge" : problem === "notPdf" ? "profile.cv.notPdf" : null,
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !file) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("label", label.trim());
    if (language.trim() !== "") formData.set("language", language.trim());

    mutation.mutate(formData, {
      onSuccess: (result) => {
        toast.success(t("profile.cv.uploaded"));
        resetForm();
        onOpenChange(false);
        onImported(result);
      },
      onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.cv.uploadFailed")),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.cv.uploadTitle")}</DialogTitle>
          <DialogDescription>{t("profile.cv.description", { count: CV_MAX_COUNT })}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="profile-cv-file">{t("profile.cv.file")}</FieldLabel>
            <Input
              id="profile-cv-file"
              type="file"
              accept="application/pdf,.pdf"
              aria-invalid={fileErrorKey !== null}
              className="h-11 sm:h-9"
              onChange={handleFileChange}
            />
            {fileErrorKey !== null ? <FieldError>{t(fileErrorKey)}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-cv-label">{t("profile.cv.label")}</FieldLabel>
            <Input
              id="profile-cv-label"
              value={label}
              maxLength={CV_LABEL_MAX_LENGTH}
              placeholder={t("profile.cv.labelPlaceholder")}
              autoComplete="off"
              className="h-11 sm:h-9"
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-cv-language">{t("profile.cv.language")}</FieldLabel>
            <Input
              id="profile-cv-language"
              value={language}
              maxLength={CV_LANGUAGE_MAX_LENGTH}
              placeholder={t("profile.cv.languagePlaceholder")}
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
              {mutation.isPending ? t("common.saving") : t("profile.cv.upload")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
