"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SimilarPlatformPrompt } from "@/components/applications/similar-platform-prompt";
import { useCreatePlatform } from "@/hooks/use-create-platform";
import { useUpdateApplication } from "@/hooks/use-update-application";
import { ApiError } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { useT } from "@/components/i18n/i18n-provider";
import { REVIEW_REASON_LABEL_KEYS, platformOptionLabel } from "@/lib/i18n/label-keys";
import { similarPlatformFromErrorDetails } from "@/lib/platforms";
import { getVisibleReviewReasons } from "@/lib/review-reasons";
import type { ApplicationDTO, PlatformOptionDTO } from "@/lib/api-types";

type ReviewReminderProps = {
  application: ApplicationDTO;
};

export function ReviewReminder({ application }: ReviewReminderProps) {
  const t = useT();
  const updateMutation = useUpdateApplication(application.id);
  const createPlatformMutation = useCreatePlatform();
  const [similar, setSimilar] = useState<PlatformOptionDTO | null>(null);

  const reasons = getVisibleReviewReasons(application);
  if (reasons.length === 0) return null;

  const suggestedName = reasons.includes("platform") ? (application.suggestedPlatformName ?? null) : null;
  const isPending = updateMutation.isPending || createPlatformMutation.isPending;

  function dismiss() {
    updateMutation.mutate(
      { reviewReasons: [], suggestedPlatformName: null },
      { onSuccess: () => toast.success(t("review.reminder.hidden")) },
    );
  }

  function applyPlatform(option: Pick<PlatformOptionDTO, "label" | "platform" | "customPlatformId">) {
    updateMutation.mutate(
      {
        platform: option.platform,
        ...(option.customPlatformId ? { customPlatformId: option.customPlatformId } : {}),
        suggestedPlatformName: null,
      },
      {
        onSuccess: () => {
          setSimilar(null);
          toast.success(t("review.reminder.platformSet", { label: platformOptionLabel(t, option) }));
        },
      },
    );
  }

  function addSuggestedPlatform(confirmNew = false) {
    if (!suggestedName || isPending) return;

    createPlatformMutation.mutate(
      { name: suggestedName, confirmNew },
      {
        onSuccess: ({ platform }) => applyPlatform(platform),
        onError: (error) => {
          const similarPlatform = error instanceof ApiError ? similarPlatformFromErrorDetails(error.details) : null;
          if (similarPlatform) {
            setSimilar(similarPlatform);
            return;
          }
          toast.error(getApiErrorMessage(t, error, "form.platform.addFailed"));
        },
      },
    );
  }

  return (
    <section
      aria-label={t("review.reminder.ariaLabel")}
      className="rounded-lg border border-dashed border-[var(--gh-border-strong,var(--border))] bg-[var(--gh-surface-subtle,var(--muted))] p-3"
    >
      <p className="text-sm font-medium text-[var(--gh-text,var(--foreground))]">{t("review.reminder.title")}</p>
      <ul className="mt-1.5 list-disc pl-5 text-sm text-[var(--gh-text-secondary,var(--muted-foreground))]">
        {reasons.map((reason) => (
          <li key={reason}>
            {reason === "platform" && suggestedName
              ? t("review.reminder.platformSuggested", { name: suggestedName })
              : t(REVIEW_REASON_LABEL_KEYS[reason])}
          </li>
        ))}
      </ul>

      {similar && suggestedName && (
        <div className="mt-3">
          <SimilarPlatformPrompt
            name={suggestedName}
            similar={similar}
            pending={isPending}
            onUseExisting={() => applyPlatform(similar)}
            onCreateAnyway={() => addSuggestedPlatform(true)}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestedName && !similar && (
          <Button
            type="button"
            size="sm"
            className="h-10 sm:h-8"
            disabled={isPending}
            aria-busy={isPending}
            onClick={() => addSuggestedPlatform()}
          >
            {t("review.reminder.addPlatform", { name: suggestedName })}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 sm:h-8"
          disabled={isPending}
          onClick={dismiss}
        >
          {t("review.reminder.hide")}
        </Button>
      </div>
    </section>
  );
}
