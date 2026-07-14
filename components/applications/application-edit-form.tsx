"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApplicationFormFields } from "@/components/applications/application-form-fields";
import { UnsavedChangesDialog } from "@/components/overlay/unsaved-changes-dialog";
import { useUpdateApplication } from "@/hooks/use-update-application";
import {
  applicationFormSchema,
  applicationFormValuesFromApplication,
  applicationFormValuesToUpdatePayload,
  type ApplicationFormValues,
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
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: applicationFormValuesFromApplication(application),
  });

  useEffect(() => {
    onDirtyChange(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    onPendingChange(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  function onInvalid(errors: FieldErrors<ApplicationFormValues>) {
    const firstInvalidField = Object.keys(errors)[0] as keyof ApplicationFormValues | undefined;
    if (firstInvalidField) form.setFocus(firstInvalidField);
  }

  function onValid(values: ApplicationFormValues) {
    if (mutation.isPending) return;

    const payload = applicationFormValuesToUpdatePayload(values);
    mutation.mutate(payload, {
      onSuccess: (updated) => {
        toast.success("Changes saved");
        form.reset(applicationFormValuesFromApplication(updated));
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
    form.reset(applicationFormValuesFromApplication(application));
    onCancel();
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate className="flex flex-col gap-4">
        <ApplicationFormFields />
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
