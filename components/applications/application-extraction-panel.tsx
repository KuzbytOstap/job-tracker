"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useExtractApplication } from "@/hooks/use-extract-application";
import { inferPlatformFromLink } from "@/lib/platform-inference";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApplicationFormValues } from "@/lib/application-form";
import type { ApplicationExtractionResult } from "@/lib/application-extraction";

type ApplicationExtractionPanelProps = {
  jobPostingText: string;
  coverLetterText: string;
  onJobPostingTextChange: (value: string) => void;
  onCoverLetterTextChange: (value: string) => void;
};

const GENERIC_ERROR_MESSAGE = "Couldn't analyze the posting. You can retry or fill the form manually.";

type TextFieldName = "company" | "position" | "salaryExpectation" | "link" | "notes";

export function ApplicationExtractionPanel({
  jobPostingText,
  coverLetterText,
  onJobPostingTextChange,
  onCoverLetterTextChange,
}: ApplicationExtractionPanelProps) {
  const [open, setOpen] = useState(true);
  const [lastResultProvider, setLastResultProvider] = useState<"mock" | "openai" | null>(null);
  const form = useFormContext<ApplicationFormValues>();
  const mutation = useExtractApplication();

  function applyTextField(field: TextFieldName, value: string | null, counts: { filled: number; kept: number }) {
    if (value === null) return;
    const current = form.getValues(field);
    if (current.trim() === "") {
      form.setValue(field, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      counts.filled += 1;
    } else {
      counts.kept += 1;
    }
  }

  function applyExtractionResult(result: ApplicationExtractionResult) {
    const counts = { filled: 0, kept: 0 };

    applyTextField("company", result.company, counts);
    applyTextField("position", result.position, counts);
    applyTextField("salaryExpectation", result.salaryExpectation, counts);
    applyTextField("link", result.link, counts);
    applyTextField("notes", result.notes, counts);

    const inferredPlatform = result.link ? inferPlatformFromLink(result.link) : null;
    const effectivePlatform = inferredPlatform ?? result.platform;
    if (effectivePlatform !== null) {
      if (form.formState.dirtyFields.platform) {
        counts.kept += 1;
      } else {
        form.setValue("platform", effectivePlatform, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        counts.filled += 1;
      }
    }

    return counts;
  }

  function handleAnalyze() {
    if (mutation.isPending) return;
    if (jobPostingText.trim().length === 0) return;

    mutation.mutate(
      {
        jobPostingText,
        coverLetterText: coverLetterText.trim().length > 0 ? coverLetterText : undefined,
      },
      {
        onSuccess: (response) => {
          setLastResultProvider(response.meta.provider);
          const { filled, kept } = applyExtractionResult(response.result);
          const summary =
            kept > 0
              ? `Filled ${filled} field${filled === 1 ? "" : "s"}. ${kept} existing value${kept === 1 ? "" : "s"} were kept.`
              : `Filled ${filled} field${filled === 1 ? "" : "s"}.`;
          toast.success(summary);
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
        },
      },
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="gh-extraction-panel rounded-lg border p-3">
      <CollapsibleTrigger
        className="flex min-h-9 w-full items-center justify-between gap-2 text-left text-sm font-medium sm:min-h-11"
      >
        <span className="flex items-center gap-2.5">
          <span className="gh-extraction-icon hidden size-7 shrink-0 items-center justify-center sm:flex">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span>Fill from job posting</span>
            <span className="gh-extraction-subtitle hidden text-xs font-normal sm:block">
              Optional — prefills the form below
            </span>
          </span>
        </span>
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
          <FieldDescription>
            Paste a job posting and optionally your cover letter. The extracted values will only prefill the form —
            nothing is saved automatically.
          </FieldDescription>

          <Field>
            <FieldLabel htmlFor="extraction-job-posting">Job posting</FieldLabel>
            <Textarea
              id="extraction-job-posting"
              rows={6}
              className="min-h-32"
              placeholder="Paste the job posting text here…"
              value={jobPostingText}
              onChange={(event) => onJobPostingTextChange(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="extraction-cover-letter">Cover letter (optional)</FieldLabel>
            <Textarea
              id="extraction-cover-letter"
              rows={3}
              className="min-h-20"
              placeholder="Paste your cover letter for extra context…"
              value={coverLetterText}
              onChange={(event) => onCoverLetterTextChange(event.target.value)}
            />
          </Field>

          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error instanceof ApiError ? mutation.error.message : GENERIC_ERROR_MESSAGE}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              disabled={mutation.isPending || jobPostingText.trim().length === 0}
              aria-busy={mutation.isPending}
              onClick={handleAnalyze}
            >
              {mutation.isPending ? "Analyzing…" : "Analyze posting"}
            </Button>
            {mutation.isSuccess && lastResultProvider === "mock" && (
              <p className="text-xs text-muted-foreground">Mock result — no external AI request was made.</p>
            )}
            {mutation.isSuccess && lastResultProvider === "openai" && (
              <p className="text-xs text-muted-foreground">Posting analyzed.</p>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
