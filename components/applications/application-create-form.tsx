"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApplicationFormFields } from "@/components/applications/application-form-fields";
import { ApplicationExtractionPanel } from "@/components/applications/application-extraction-panel";
import { UnsavedChangesDialog } from "@/components/overlay/unsaved-changes-dialog";
import { useCreateApplication } from "@/hooks/use-create-application";
import {
  applicationFormSchema,
  applicationFormValuesToCreatePayload,
  defaultApplicationFormValues,
  normalizeSourceText,
  type ApplicationFormValues,
} from "@/lib/application-form";
import { getStatusPageHref } from "@/lib/board-columns";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO, CreateApplicationPayload } from "@/lib/api-types";

type ApplicationCreateFormProps = {
  currentStatusSlug?: string;
  onCreated: (application: ApplicationDTO) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
};

export function ApplicationCreateForm({
  currentStatusSlug,
  onCreated,
  onCancel,
  onDirtyChange,
  onPendingChange,
}: ApplicationCreateFormProps) {
  const router = useRouter();
  const mutation = useCreateApplication();
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [jobPostingText, setJobPostingText] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: defaultApplicationFormValues(),
  });

  const hasSourceText = jobPostingText.trim().length > 0 || coverLetterText.trim().length > 0;

  useEffect(() => {
    onDirtyChange(form.formState.isDirty || hasSourceText);
  }, [form.formState.isDirty, hasSourceText, onDirtyChange]);

  useEffect(() => {
    onPendingChange(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  function onInvalid(errors: FieldErrors<ApplicationFormValues>) {
    const firstInvalidField = Object.keys(errors)[0] as keyof ApplicationFormValues | undefined;
    if (firstInvalidField) form.setFocus(firstInvalidField);
  }

  function handleCancelClick() {
    if (form.formState.isDirty || hasSourceText) {
      setConfirmDiscardOpen(true);
      return;
    }
    onCancel();
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false);
    form.reset(defaultApplicationFormValues());
    setJobPostingText("");
    setCoverLetterText("");
    onCancel();
  }

  function onValid(values: ApplicationFormValues) {
    if (mutation.isPending) return;

    const payload: CreateApplicationPayload = {
      ...applicationFormValuesToCreatePayload(values),
      jobPostingText: normalizeSourceText(jobPostingText),
      coverLetterText: normalizeSourceText(coverLetterText),
    };
    mutation.mutate(payload, {
      onSuccess: (created) => {
        const showViewAppliedAction = currentStatusSlug != null && currentStatusSlug !== "applied";
        toast.success(`${created.company} added to Applied`, {
          action: showViewAppliedAction
            ? {
                label: "View Applied",
                onClick: () => router.push(getStatusPageHref(Status.APPLIED)),
              }
            : undefined,
        });
        form.reset(defaultApplicationFormValues());
        setJobPostingText("");
        setCoverLetterText("");
        onCreated(created);
      },
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate className="gh-app-form flex flex-col gap-5">
        <ApplicationExtractionPanel
          jobPostingText={jobPostingText}
          coverLetterText={coverLetterText}
          onJobPostingTextChange={setJobPostingText}
          onCoverLetterTextChange={setCoverLetterText}
        />
        <ApplicationFormFields showTestTaskCheckbox sectioned />
        <div className="flex flex-col-reverse gap-2 border-t pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:sticky sm:bottom-0 sm:-mx-5 sm:-mb-4 sm:border-t sm:border-[var(--gh-border)] sm:bg-[var(--gh-surface)] sm:px-5 sm:py-4 sm:shadow-[0_-10px_20px_-16px_oklch(0.24_0.02_50_/_0.16)]">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 sm:h-8 sm:flex-none"
            disabled={mutation.isPending}
            onClick={handleCancelClick}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-10 flex-1 sm:h-8 sm:flex-none"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
          >
            {mutation.isPending ? "Adding…" : "Add application"}
          </Button>
        </div>
      </form>
      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirmDiscard={handleConfirmDiscard}
        visualVariant="gameHub"
      />
    </FormProvider>
  );
}
