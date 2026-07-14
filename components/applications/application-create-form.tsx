"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApplicationFormFields } from "@/components/applications/application-form-fields";
import { useCreateApplication } from "@/hooks/use-create-application";
import {
  applicationFormSchema,
  applicationFormValuesToCreatePayload,
  defaultApplicationFormValues,
  type ApplicationFormValues,
} from "@/lib/application-form";
import { getStatusPageHref } from "@/lib/board-columns";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO } from "@/lib/api-types";

type ApplicationCreateFormProps = {
  currentStatusSlug?: string;
  onCreated: (application: ApplicationDTO) => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
};

export function ApplicationCreateForm({
  currentStatusSlug,
  onCreated,
  onDirtyChange,
  onPendingChange,
}: ApplicationCreateFormProps) {
  const router = useRouter();
  const mutation = useCreateApplication();
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: defaultApplicationFormValues(),
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

    const payload = applicationFormValuesToCreatePayload(values);
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
        onCreated(created);
      },
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate className="flex flex-col gap-4">
        <ApplicationFormFields showTestTaskCheckbox />
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add application"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
