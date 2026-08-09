"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getUrlLabel } from "@/lib/url-labels";
import { cn } from "@/lib/utils";
import type { ApplicationEditFormValues } from "@/lib/application-form";

export function ApplicationSourceMaterialsFields() {
  const {
    register,
    control,
    getValues,
    formState: { errors },
  } = useFormContext<ApplicationEditFormValues>();

  const { fields, append, remove } = useFieldArray({ control, name: "sourceUrls" });

  const [open, setOpen] = useState(
    () =>
      getValues("jobPostingText").trim().length > 0 ||
      getValues("coverLetterText").trim().length > 0 ||
      getValues("sourceUrls").length > 0,
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="gh-source-panel rounded-lg border p-3">
      <CollapsibleTrigger
        className="flex min-h-9 w-full items-center justify-between gap-2 text-left text-sm font-medium"
      >
        Source materials
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none data-[ending-style]:h-0 data-[starting-style]:h-0">
        <div className="flex flex-col gap-3 pt-3">
          <Field data-invalid={!!errors.jobPostingText}>
            <FieldLabel htmlFor="application-job-posting-text">Job posting</FieldLabel>
            <Textarea
              id="application-job-posting-text"
              rows={6}
              className="min-h-32"
              aria-invalid={!!errors.jobPostingText}
              {...register("jobPostingText")}
            />
            <FieldError errors={[errors.jobPostingText]} />
          </Field>

          <Field data-invalid={!!errors.coverLetterText}>
            <FieldLabel htmlFor="application-cover-letter-text">Cover letter</FieldLabel>
            <Textarea
              id="application-cover-letter-text"
              rows={3}
              className="min-h-20"
              aria-invalid={!!errors.coverLetterText}
              {...register("coverLetterText")}
            />
            <FieldError errors={[errors.coverLetterText]} />
          </Field>

          <div className="flex flex-col gap-2">
            <FieldLabel>Source URLs</FieldLabel>
            {fields.length > 0 && (
              <div className="flex flex-col gap-2">
                {fields.map((field, index) => (
                  <SourceUrlRow key={field.id} index={index} onRemove={() => remove(index)} />
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => append({ url: "" })}
            >
              <Plus data-icon="inline-start" />
              Add source
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SourceUrlRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { register, control, formState: { errors } } = useFormContext<ApplicationEditFormValues>();
  const url = useWatch({ control, name: `sourceUrls.${index}.url` }) ?? "";
  const label = url.trim().length > 0 ? getUrlLabel(url.trim()) : "New source";
  const fieldError = errors.sourceUrls?.[index]?.url;

  return (
    <Field data-invalid={!!fieldError}>
      <FieldLabel htmlFor={`application-source-url-${index}`} className="text-xs font-normal text-muted-foreground">
        {label}
      </FieldLabel>
      <div className="flex items-center gap-1.5">
        <Input
          id={`application-source-url-${index}`}
          type="url"
          inputMode="url"
          placeholder="https://…"
          aria-invalid={!!fieldError}
          className="h-9 flex-1 sm:h-8"
          {...register(`sourceUrls.${index}.url`)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-[var(--gh-text-muted,var(--muted-foreground))] hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove source ${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>
      <FieldError errors={[fieldError]} />
    </Field>
  );
}
