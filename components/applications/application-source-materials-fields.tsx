"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ApplicationEditFormValues } from "@/lib/application-form";

export function ApplicationSourceMaterialsFields() {
  const {
    register,
    getValues,
    formState: { errors },
  } = useFormContext<ApplicationEditFormValues>();

  const [open, setOpen] = useState(
    () => getValues("jobPostingText").trim().length > 0 || getValues("coverLetterText").trim().length > 0,
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border p-3">
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
