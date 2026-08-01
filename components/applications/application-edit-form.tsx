"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ApplicationFormFields } from "@/components/applications/application-form-fields";
import { ApplicationSourceMaterialsFields } from "@/components/applications/application-source-materials-fields";
import { UnsavedChangesDialog } from "@/components/overlay/unsaved-changes-dialog";
import { useUpdateApplication } from "@/hooks/use-update-application";
import {
  applicationEditFormSchema,
  applicationEditFormValuesFromApplication,
  applicationEditFormValuesToUpdatePayload,
  shouldShowHrCallTranscriptField,
  type ApplicationEditFormValues,
} from "@/lib/application-form";
import type { ApplicationDTO } from "@/lib/api-types";

type ApplicationEditFormProps = {
  application: ApplicationDTO;
  onSaved: (updated: ApplicationDTO) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
};

export function ApplicationEditForm({
  application,
  onSaved,
  onCancel,
  onDirtyChange,
  onPendingChange,
}: ApplicationEditFormProps) {
  const mutation = useUpdateApplication(application.id);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const showHrCallTranscript = shouldShowHrCallTranscriptField(application);
  const form = useForm<ApplicationEditFormValues>({
    resolver: zodResolver(applicationEditFormSchema),
    defaultValues: applicationEditFormValuesFromApplication(application),
  });

  useEffect(() => {
    onDirtyChange(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    onPendingChange(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  function onInvalid(errors: FieldErrors<ApplicationEditFormValues>) {
    const firstInvalidField = Object.keys(errors)[0] as keyof ApplicationEditFormValues | undefined;
    if (firstInvalidField) form.setFocus(firstInvalidField);
  }

  function onValid(values: ApplicationEditFormValues) {
    if (mutation.isPending) return;

    const payload = applicationEditFormValuesToUpdatePayload(values);
    mutation.mutate(payload, {
      onSuccess: (updated) => {
        toast.success("Changes saved");
        form.reset(applicationEditFormValuesFromApplication(updated));
        onSaved(updated);
      },
    });
  }

  function handleCancelClick() {
    if (form.formState.isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onCancel();
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false);
    form.reset(applicationEditFormValuesFromApplication(application));
    onCancel();
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate className="flex flex-col gap-4">
        <ApplicationFormFields />
        <ApplicationSourceMaterialsFields />
        {showHrCallTranscript && (
          <Field data-invalid={!!form.formState.errors.hrCallTranscript}>
            <FieldLabel htmlFor="application-hr-call-transcript">HR call transcript</FieldLabel>
            <Textarea
              id="application-hr-call-transcript"
              rows={6}
              className="min-h-32"
              aria-invalid={!!form.formState.errors.hrCallTranscript}
              {...form.register("hrCallTranscript")}
            />
            <FieldError errors={[form.formState.errors.hrCallTranscript]} />
          </Field>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={handleCancelClick} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirmDiscard={handleConfirmDiscard}
      />
    </FormProvider>
  );
}
