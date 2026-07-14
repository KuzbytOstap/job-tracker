"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORM_LABELS } from "@/lib/labels";
import { PLATFORM_VALUES } from "@/lib/validation";
import type { ApplicationFormValues } from "@/lib/application-form";

type ApplicationFormFieldsProps = {
  showTestTaskCheckbox?: boolean;
};

export function ApplicationFormFields({ showTestTaskCheckbox = false }: ApplicationFormFieldsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormValues>();

  return (
    <div className="flex flex-col gap-4">
      <Field data-invalid={!!errors.company}>
        <FieldLabel htmlFor="application-company">Company</FieldLabel>
        <Input
          id="application-company"
          autoFocus
          aria-invalid={!!errors.company}
          {...register("company")}
        />
        <FieldError errors={[errors.company]} />
      </Field>

      <Field data-invalid={!!errors.position}>
        <FieldLabel htmlFor="application-position">Position</FieldLabel>
        <Input id="application-position" aria-invalid={!!errors.position} {...register("position")} />
        <FieldError errors={[errors.position]} />
      </Field>

      <Field data-invalid={!!errors.platform}>
        <FieldLabel htmlFor="application-platform">Platform</FieldLabel>
        <Controller
          control={control}
          name="platform"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="application-platform" aria-invalid={!!errors.platform} className="w-full">
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_VALUES.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {PLATFORM_LABELS[platform]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.platform]} />
      </Field>

      <Field data-invalid={!!errors.link}>
        <FieldLabel htmlFor="application-link">Vacancy link</FieldLabel>
        <Input
          id="application-link"
          type="url"
          inputMode="url"
          placeholder="https://…"
          aria-invalid={!!errors.link}
          {...register("link")}
        />
        <FieldError errors={[errors.link]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="application-salary">Salary expectation</FieldLabel>
        <Input id="application-salary" placeholder="e.g. $4000–5000" {...register("salaryExpectation")} />
      </Field>

      <Field data-invalid={!!errors.appliedAt}>
        <FieldLabel htmlFor="application-applied-at">Applied on</FieldLabel>
        <Input
          id="application-applied-at"
          type="date"
          aria-invalid={!!errors.appliedAt}
          {...register("appliedAt")}
        />
        <FieldError errors={[errors.appliedAt]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="application-notes">Notes</FieldLabel>
        <Textarea id="application-notes" rows={3} {...register("notes")} />
      </Field>

      {showTestTaskCheckbox && (
        <Field orientation="horizontal">
          <Controller
            control={control}
            name="hasTestTask"
            render={({ field }) => (
              <Checkbox
                id="application-has-test-task"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <FieldLabel htmlFor="application-has-test-task" className="font-normal">
            This application includes a test task
          </FieldLabel>
        </Field>
      )}
    </div>
  );
}
