"use client";

import type { ReactNode } from "react";
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
  /** Interspersed section headings for the mobile-first create flow. Edit form omits this to stay unchanged. */
  sectioned?: boolean;
};

function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-medium tracking-wide text-muted-foreground uppercase ${className ?? ""}`}>
      {children}
    </p>
  );
}

const fieldInputClassName = "h-10 sm:h-8";

export function ApplicationFormFields({ showTestTaskCheckbox = false, sectioned = false }: ApplicationFormFieldsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormValues>();

  return (
    <div className="flex flex-col gap-4">
      {sectioned && <SectionHeading>Main information</SectionHeading>}

      <Field data-invalid={!!errors.company}>
        <FieldLabel htmlFor="application-company">Company</FieldLabel>
        <Input
          id="application-company"
          autoFocus
          aria-invalid={!!errors.company}
          className={fieldInputClassName}
          {...register("company")}
        />
        <FieldError errors={[errors.company]} />
      </Field>

      <Field data-invalid={!!errors.position}>
        <FieldLabel htmlFor="application-position">Position</FieldLabel>
        <Input
          id="application-position"
          aria-invalid={!!errors.position}
          className={fieldInputClassName}
          {...register("position")}
        />
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
          className={fieldInputClassName}
          {...register("link")}
        />
        <FieldError errors={[errors.link]} />
      </Field>

      {sectioned && <SectionHeading className="mt-2">Application details</SectionHeading>}

      <Field>
        <FieldLabel htmlFor="application-salary">Salary expectation</FieldLabel>
        <Input
          id="application-salary"
          placeholder="e.g. $4000–5000"
          defaultValue={3000}
          className={fieldInputClassName}
          {...register("salaryExpectation")}
        />
      </Field>

      <Field data-invalid={!!errors.appliedAt}>
        <FieldLabel htmlFor="application-applied-at">Applied on</FieldLabel>
        <Input
          id="application-applied-at"
          type="date"
          aria-invalid={!!errors.appliedAt}
          className={fieldInputClassName}
          {...register("appliedAt")}
        />
        <FieldError errors={[errors.appliedAt]} />
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

      {sectioned && <SectionHeading className="mt-2">Notes</SectionHeading>}

      <Field>
        <FieldLabel htmlFor="application-notes" className={sectioned ? "sr-only" : undefined}>
          Notes
        </FieldLabel>
        <Textarea id="application-notes" rows={3} className="min-h-24" {...register("notes")} />
      </Field>
    </div>
  );
}
