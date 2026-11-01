"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Sparkles } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useExtractApplication } from "@/hooks/use-extract-application";
import { useCreatePlatform } from "@/hooks/use-create-platform";
import { useI18n } from "@/components/i18n/i18n-provider";
import { platformOptionLabel } from "@/lib/i18n/label-keys";
import { SimilarPlatformPrompt } from "@/components/applications/similar-platform-prompt";
import { similarPlatformFromErrorDetails } from "@/lib/platforms";
import { useAiAccessStatus } from "@/hooks/use-ai-access-status";
import { useAiUsageStatus } from "@/hooks/use-ai-usage-status";
import { AiAccessNotice } from "@/components/ai/ai-access-notice";
import { AiQuotaNotice } from "@/components/ai/ai-quota-notice";
import { inferPlatformFromLink } from "@/lib/platform-inference";
import { ApiError } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { queryKeys } from "@/lib/query-keys";
import { extractAiQuotaReasonFromError, quotaForReason, resolveAiQuotaReason } from "@/lib/ai-quota";
import { cn } from "@/lib/utils";
import { AiAccessStatus } from "@/app/generated/prisma/enums";
import type { ApplicationFormValues } from "@/lib/application-form";
import type { ApplicationExtractionResult } from "@/lib/application-extraction";
import type { PlatformOptionDTO } from "@/lib/api-types";

type ApplicationExtractionPanelProps = {
  jobPostingText: string;
  coverLetterText: string;
  onJobPostingTextChange: (value: string) => void;
  onCoverLetterTextChange: (value: string) => void;
};

type TextFieldName = "company" | "position" | "salaryExpectation" | "link" | "notes";

export function ApplicationExtractionPanel({
  jobPostingText,
  coverLetterText,
  onJobPostingTextChange,
  onCoverLetterTextChange,
}: ApplicationExtractionPanelProps) {
  const { t, rich } = useI18n();
  const [open, setOpen] = useState(true);
  const [lastResultProvider, setLastResultProvider] = useState<"mock" | "openai" | null>(null);
  const [suggestedPlatformName, setSuggestedPlatformName] = useState<string | null>(null);
  const [similarPlatform, setSimilarPlatform] = useState<PlatformOptionDTO | null>(null);
  const queryClient = useQueryClient();
  const form = useFormContext<ApplicationFormValues>();
  const mutation = useExtractApplication();
  const createPlatformMutation = useCreatePlatform();
  const aiAccess = useAiAccessStatus();
  const aiAccessStatus = aiAccess.data?.status;
  const aiUsage = useAiUsageStatus(aiAccessStatus === AiAccessStatus.APPROVED);
  const mutationErrorReason =
    mutation.error instanceof ApiError ? extractAiQuotaReasonFromError(mutation.error.details) : null;
  const quotaReason = resolveAiQuotaReason(aiUsage.data, "VACANCY_GENERATION") ?? mutationErrorReason;

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
        form.setValue("customPlatformId", null, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        counts.filled += 1;
      }
    }

    return counts;
  }

  function selectPlatformOption(option: Pick<PlatformOptionDTO, "platform" | "customPlatformId">) {
    const options = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
    form.setValue("platform", option.platform, options);
    form.setValue("customPlatformId", option.customPlatformId, options);
    setSuggestedPlatformName(null);
    setSimilarPlatform(null);
  }

  function handleAcceptSuggestedPlatform(confirmNew = false) {
    if (!suggestedPlatformName || createPlatformMutation.isPending) return;

    createPlatformMutation.mutate(
      { name: suggestedPlatformName, confirmNew },
      {
        onSuccess: ({ platform, created }) => {
          selectPlatformOption(platform);
          const label = platformOptionLabel(t, platform);
          toast.success(
            created ? t("form.platform.added", { name: label }) : t("form.platform.alreadyExists", { name: label }),
          );
        },
        onError: (error) => {
          const similar = error instanceof ApiError ? similarPlatformFromErrorDetails(error.details) : null;
          if (similar) {
            setSimilarPlatform(similar);
            return;
          }
          toast.error(getApiErrorMessage(t, error, "form.platform.addFailed"));
        },
      },
    );
  }

  function handleAnalyze() {
    if (mutation.isPending) return;
    if (jobPostingText.trim().length === 0) return;
    if (aiAccessStatus !== AiAccessStatus.APPROVED) return;
    if (quotaReason) return;

    setSuggestedPlatformName(null);
    setSimilarPlatform(null);

    mutation.mutate(
      {
        jobPostingText,
        coverLetterText: coverLetterText.trim().length > 0 ? coverLetterText : undefined,
      },
      {
        onSuccess: (response) => {
          setLastResultProvider(response.meta.provider);
          setSuggestedPlatformName(response.result.suggestedPlatformName ?? null);
          const { filled, kept } = applyExtractionResult(response.result);
          const filledText = t("extraction.filledFields", { count: filled });
          const summary =
            kept > 0 ? `${filledText} ${t("extraction.keptValues", { count: kept })}` : filledText;
          toast.success(summary);
        },
        onError: (error) => {
          if (error instanceof ApiError && extractAiQuotaReasonFromError(error.details)) {
            queryClient.invalidateQueries({ queryKey: queryKeys.aiUsage() });
            return;
          }
          toast.error(getApiErrorMessage(t, error, "extraction.genericError"));
        },
      },
    );
  }

  if (aiAccessStatus === AiAccessStatus.REJECTED) {
    return null;
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
            <span>{t("extraction.title")}</span>
            <span className="gh-extraction-subtitle hidden text-xs font-normal sm:block">
              {t("extraction.subtitle")}
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
            {t("extraction.description")}
          </FieldDescription>

          <Field>
            <FieldLabel htmlFor="extraction-job-posting">{t("extraction.jobPosting")}</FieldLabel>
            <Textarea
              id="extraction-job-posting"
              rows={6}
              className="min-h-32"
              placeholder={t("extraction.jobPostingPlaceholder")}
              value={jobPostingText}
              onChange={(event) => onJobPostingTextChange(event.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="extraction-cover-letter">{t("extraction.coverLetter")}</FieldLabel>
            <Textarea
              id="extraction-cover-letter"
              rows={3}
              className="min-h-20"
              placeholder={t("extraction.coverLetterPlaceholder")}
              value={coverLetterText}
              onChange={(event) => onCoverLetterTextChange(event.target.value)}
            />
          </Field>

          {suggestedPlatformName && similarPlatform && (
            <SimilarPlatformPrompt
              name={suggestedPlatformName}
              similar={similarPlatform}
              pending={createPlatformMutation.isPending}
              onUseExisting={() => selectPlatformOption(similarPlatform)}
              onCreateAnyway={() => handleAcceptSuggestedPlatform(true)}
            />
          )}

          {suggestedPlatformName && !similarPlatform && (
            <div
              role="status"
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-dashed border-[var(--gh-border-strong,var(--border))] p-2.5 text-sm"
            >
              <span>
                {rich("extraction.platformNotInList", { strong: (chunk) => <strong>{chunk}</strong> }, { name: suggestedPlatformName })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={createPlatformMutation.isPending}
                  aria-busy={createPlatformMutation.isPending}
                  onClick={() => handleAcceptSuggestedPlatform()}
                >
                  {createPlatformMutation.isPending ? t("form.platform.adding") : t("extraction.addPlatform")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSuggestedPlatformName(null)}>
                  {t("common.dismiss")}
                </Button>
              </div>
            </div>
          )}

          {mutation.isError && !quotaReason && (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(t, mutation.error, "extraction.genericError")}
            </p>
          )}

          {aiAccessStatus !== AiAccessStatus.APPROVED ? (
            <AiAccessNotice status={aiAccessStatus} />
          ) : quotaReason && aiUsage.data ? (
            <AiQuotaNotice
              reason={quotaReason}
              quota={quotaForReason(aiUsage.data, quotaReason)}
              resetAt={aiUsage.data.resetAt}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                disabled={
                  mutation.isPending ||
                  jobPostingText.trim().length === 0 ||
                  aiAccessStatus == null ||
                  quotaReason != null
                }
                aria-busy={mutation.isPending}
                onClick={handleAnalyze}
              >
                {mutation.isPending ? t("extraction.analyzing") : t("extraction.analyze")}
              </Button>
              {mutation.isSuccess && lastResultProvider === "mock" && (
                <p className="text-xs text-muted-foreground">{t("extraction.mockNotice")}</p>
              )}
              {mutation.isSuccess && lastResultProvider === "openai" && (
                <p className="text-xs text-muted-foreground">{t("extraction.analyzed")}</p>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
