"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleQuestionMark, LoaderCircle, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { AiAccessNotice } from "@/components/ai/ai-access-notice";
import { AiQuotaNotice } from "@/components/ai/ai-quota-notice";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAnalyzeApplicationFit, useIsAnalyzingApplicationFit } from "@/hooks/use-analyze-application-fit";
import { ApiError } from "@/lib/api";
import { extractAiQuotaReasonFromError, quotaForReason, resolveAiQuotaReason } from "@/lib/ai-quota";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { skipReasonMessageKey } from "@/lib/profile/skip-reasons";
import { formatExactDateTime, formatRelativeDate } from "@/lib/relative-date";
import { cn } from "@/lib/utils";
import { AiAccessStatus } from "@/app/generated/prisma/enums";
import type { AiUsageStatusResponse, ApplicationDTO, FitItemDTO, FitVerdictValue } from "@/lib/api-types";

type FitAnalysisSectionProps = {
  application: ApplicationDTO;
  aiAccessStatus: AiAccessStatus | undefined;
  aiUsage?: AiUsageStatusResponse;
};

const VERDICT_STYLES: Record<FitVerdictValue, { icon: LucideIcon; className: string }> = {
  MATCH: {
    icon: CircleCheck,
    className: "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  },
  MISMATCH: {
    icon: TriangleAlert,
    className: "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300",
  },
  UNKNOWN: {
    icon: CircleQuestionMark,
    className: "bg-muted text-muted-foreground",
  },
};

function FitItemRow({ item }: { item: FitItemDTO }) {
  const { t } = useI18n();
  const style = VERDICT_STYLES[item.verdict];
  const Icon = style.icon;

  return (
    <li className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-[var(--gh-text,var(--foreground))]">
          {t(`fit.criteria.${item.criterion}`)}
        </p>
        <Badge variant="outline" className={cn("gap-1 border-transparent", style.className)}>
          <Icon aria-hidden className="size-3" />
          {t(`fit.verdicts.${item.verdict}`)}
        </Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-[var(--gh-text-muted,var(--muted-foreground))]">{t("fit.vacancyLabel")}</dt>
        <dd className="min-w-0 break-words text-[var(--gh-text,var(--foreground))]">
          {item.vacancyValue ?? t("fit.notSpecified")}
        </dd>
        <dt className="text-[var(--gh-text-muted,var(--muted-foreground))]">{t("fit.yourLabel")}</dt>
        <dd className="min-w-0 break-words text-[var(--gh-text,var(--foreground))]">
          {item.yourValue ?? t("fit.noData")}
        </dd>
      </dl>
      <p className="text-xs leading-relaxed break-words text-[var(--gh-text-secondary,var(--muted-foreground))]">
        {item.reason}
      </p>
    </li>
  );
}

export function FitAnalysisSection({ application, aiAccessStatus, aiUsage }: FitAnalysisSectionProps) {
  const { t, locale } = useI18n();
  const mutation = useAnalyzeApplicationFit();
  const isRunning = useIsAnalyzingApplicationFit(application.id) || mutation.isPending;
  const [skip, setSkip] = useState<{ reason: string; analyzedAt: string | null } | null>(null);

  const analysis = application.fitAnalysis ?? null;
  const skipReason = skip !== null && skip.analyzedAt === (analysis?.analyzedAt ?? null) ? skip.reason : null;
  const hasVacancy = (application.jobPostingText ?? "").trim().length > 0;
  const accessLocked = aiAccessStatus !== undefined && aiAccessStatus !== AiAccessStatus.APPROVED;

  if (aiAccessStatus === AiAccessStatus.REJECTED && analysis === null) {
    return null;
  }

  const canAnalyze = aiAccessStatus !== AiAccessStatus.REJECTED;
  const skipQuotaReason = skipReason ? extractAiQuotaReasonFromError({ code: skipReason }) : null;
  const errorQuotaReason =
    mutation.error instanceof ApiError ? extractAiQuotaReasonFromError(mutation.error.details) : null;
  const quotaReason =
    (aiAccessStatus === AiAccessStatus.APPROVED ? resolveAiQuotaReason(aiUsage, "FIT_ANALYSIS") : null) ??
    skipQuotaReason ??
    errorQuotaReason;
  const showQuotaNotice = quotaReason !== null && aiUsage !== undefined;
  const missingVacancyHint = !hasVacancy && !accessLocked;
  const missingCvReason = skipReason === "NO_CV_TEXT";
  const blockedByHint = !hasVacancy || accessLocked;
  const items = analysis?.items ?? [];
  const mismatchCount = items.filter((item) => item.verdict === "MISMATCH").length;
  const unknownCount = items.filter((item) => item.verdict === "UNKNOWN").length;
  const summaryText =
    mismatchCount > 0
      ? t("fit.mismatchCount", { count: mismatchCount })
      : unknownCount === 0
        ? t("fit.summaryAllMatch")
        : t("fit.summaryPartial", { unknown: unknownCount, total: items.length });

  function handleAnalyze() {
    if (isRunning || !hasVacancy) return;

    setSkip(null);
    mutation.mutate(application.id, {
      onSuccess: (result) => {
        if (result.status === "skipped") setSkip({ reason: result.reason, analyzedAt: analysis?.analyzedAt ?? null });
      },
    });
  }

  function skipMessage(reason: string): string {
    return reason === "NO_VACANCY_TEXT" ? t("fit.needsVacancy") : t(skipReasonMessageKey(reason));
  }

  const hintId = `fit-hint-${application.id}`;
  const actionLabel = isRunning ? t("fit.analyzing") : analysis === null ? t("fit.trigger") : t("fit.refresh");

  return (
    <section aria-labelledby={`fit-title-${application.id}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3
          id={`fit-title-${application.id}`}
          className="text-xs font-medium tracking-wide text-[var(--gh-text-muted,var(--muted-foreground))] uppercase"
        >
          {t("fit.title")}
        </h3>
        {canAnalyze && !showQuotaNotice && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 sm:h-8"
            disabled={blockedByHint || isRunning}
            aria-busy={isRunning}
            aria-describedby={blockedByHint ? hintId : undefined}
            onClick={handleAnalyze}
          >
            {isRunning ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />
            ) : (
              analysis !== null && <RefreshCw data-icon="inline-start" />
            )}
            {actionLabel}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-secondary,var(--muted))] p-3">
        {analysis === null ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-[var(--gh-text,var(--foreground))]">{t("fit.empty")}</p>
            <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">{t("fit.emptyHint")}</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs",
                isRunning && "opacity-60 transition-opacity motion-reduce:transition-none",
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  mismatchCount > 0
                    ? "text-red-800 dark:text-red-300"
                    : "text-[var(--gh-text-secondary,var(--muted-foreground))]",
                )}
              >
                {summaryText}
              </span>
              <span
                className="text-[var(--gh-text-muted,var(--muted-foreground))]"
                title={formatExactDateTime(analysis.analyzedAt, { t, locale })}
              >
                {t("fit.analyzedWhen", { when: formatRelativeDate(analysis.analyzedAt, new Date(), t) })}
              </span>
            </div>
            <ul
              aria-busy={isRunning}
              className={cn(
                "flex flex-col divide-y divide-[var(--gh-border,var(--border))]",
                isRunning && "opacity-60 transition-opacity motion-reduce:transition-none",
              )}
            >
              {analysis.items.map((item) => (
                <FitItemRow key={item.criterion} item={item} />
              ))}
            </ul>
          </>
        )}

        {canAnalyze && missingVacancyHint && !showQuotaNotice && (
          <p id={hintId} className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">
            {t("fit.needsVacancy")}
          </p>
        )}

        {canAnalyze && accessLocked && (
          <div id={hintId}>
            <AiAccessNotice status={aiAccessStatus} />
          </div>
        )}

        {canAnalyze && quotaReason && aiUsage && (
          <AiQuotaNotice
            reason={quotaReason}
            quota={quotaForReason(aiUsage, quotaReason)}
            resetAt={aiUsage.resetAt}
          />
        )}

        {canAnalyze &&
          !showQuotaNotice &&
          !accessLocked &&
          aiUsage &&
          aiAccessStatus === AiAccessStatus.APPROVED && (
            <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">
              {t("fit.usage", { used: aiUsage.fitAnalysis.used, limit: aiUsage.fitAnalysis.limit })}
            </p>
          )}

        <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
          {mutation.isSuccess && mutation.data?.status === "ok" && analysis !== null && (
            <p className="sr-only">{t("fit.updated", { summary: summaryText })}</p>
          )}
          {mutation.isError && !showQuotaNotice && (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(t, mutation.error, "fit.failed")}
            </p>
          )}
          {skipReason && !(skipQuotaReason && showQuotaNotice) && (
            <p role="alert" className="text-sm text-destructive">
              {skipMessage(skipReason)}
            </p>
          )}
          {missingCvReason && (
            <Link href="/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}>
              {t("fit.openProfile")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
