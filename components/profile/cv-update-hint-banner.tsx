"use client";

import { useId, useState } from "react";
import { Copy, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/i18n-provider";
import { useCvUpdateHint } from "@/hooks/use-cv-update-hint";
import { useSnoozeCvUpdateHint } from "@/hooks/use-snooze-cv-update-hint";
import { useSuggestCvUpdates } from "@/hooks/use-suggest-cv-updates";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { CvSuggestionDTO } from "@/lib/api-types";
import { skipReasonMessageKey } from "@/lib/profile/skip-reasons";

export function CvUpdateHintBanner() {
  const t = useT();
  const headingId = useId();
  const hintQuery = useCvUpdateHint();
  const snoozeMutation = useSnoozeCvUpdateHint();
  const suggestMutation = useSuggestCvUpdates();
  const [suggestions, setSuggestions] = useState<CvSuggestionDTO[] | null>(null);
  const [skippedReason, setSkippedReason] = useState<string | null>(null);

  const hint = hintQuery.data;
  if (!hint?.visible) return null;

  function showSuggestions() {
    setSkippedReason(null);
    suggestMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.status === "ok") setSuggestions(result.suggestions);
        else setSkippedReason(result.reason);
      },
      onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.hint.suggestionsFailed")),
    });
  }

  function snooze() {
    snoozeMutation.mutate(undefined, {
      onSuccess: () => toast.success(t("profile.hint.snoozed")),
      onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.hint.snoozeFailed")),
    });
  }

  async function copyBullet(bullet: string) {
    try {
      await navigator.clipboard.writeText(bullet);
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.copyFailed"));
    }
  }

  return (
    <section
      role="status"
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl border border-[var(--gh-warning)]/40 bg-[var(--gh-warning)]/10 p-4"
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-[var(--gh-warning)]" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={headingId} className="font-heading text-base font-semibold tracking-tight text-[var(--gh-text)]">
            {t("profile.hint.title")}
          </h2>
          <p className="text-sm text-[var(--gh-text-secondary)]">
            {t("profile.hint.body", { count: hint.substantialCount })}
          </p>
        </div>
      </div>

      {skippedReason !== null ? (
        <p className="text-sm text-[var(--gh-text-secondary)]">{t(skipReasonMessageKey(skippedReason))}</p>
      ) : null}

      {suggestions !== null ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--gh-text)]">{t("profile.hint.suggestionsTitle")}</h3>
          {suggestions.length === 0 ? (
            <p className="text-sm text-[var(--gh-text-secondary)]">{t("profile.hint.noSuggestions")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.itemId}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <p className="min-w-0 flex-1 text-sm text-[var(--gh-text)]">{suggestion.bullet}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-8"
                    onClick={() => copyBullet(suggestion.bullet)}
                  >
                    <Copy data-icon="inline-start" />
                    {t("profile.hint.copy")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={snoozeMutation.isPending} onClick={snooze}>
          {t("profile.hint.remindLater")}
        </Button>
        <Button
          type="button"
          disabled={suggestMutation.isPending}
          aria-busy={suggestMutation.isPending}
          onClick={showSuggestions}
        >
          {suggestMutation.isPending ? t("profile.hint.loading") : t("profile.hint.showSuggestions")}
        </Button>
      </div>
    </section>
  );
}
