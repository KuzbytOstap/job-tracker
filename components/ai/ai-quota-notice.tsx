"use client";

import { Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRequestMoreAiUsage } from "@/hooks/use-request-more-ai-usage";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { formatExactDateTime } from "@/lib/relative-date";
import { AI_QUOTA_REQUEST_TYPE, type AiQuotaReasonCode } from "@/lib/ai-quota";
import { cn } from "@/lib/utils";
import type { AiQuotaStatus } from "@/lib/api-types";

const REASON_COPY: Record<AiQuotaReasonCode, { title: MessageKey }> = {
  VACANCY_LIMIT_REACHED: { title: "ai.quota.vacancyTitle" },
  HR_LIMIT_REACHED: { title: "ai.quota.hrTitle" },
  PROFILE_LIMIT_REACHED: { title: "ai.quota.profileTitle" },
  TOKEN_LIMIT_REACHED: { title: "ai.quota.tokenTitle" },
};

type AiQuotaNoticeProps = {
  reason: AiQuotaReasonCode;
  quota: AiQuotaStatus;
  resetAt: string;
  className?: string;
};

export function AiQuotaNotice({ reason, quota, resetAt, className }: AiQuotaNoticeProps) {
  const { t, locale } = useI18n();
  const mutation = useRequestMoreAiUsage();
  const copy = REASON_COPY[reason];
  const requestType = reason === "PROFILE_LIMIT_REACHED" ? null : AI_QUOTA_REQUEST_TYPE[reason];

  function handleRequest() {
    if (requestType === null) return;
    mutation.mutate(requestType, {
      onSuccess: () => toast.success(t("ai.quota.requested")),
      onError: (error) => toast.error(getApiErrorMessage(t, error, "ai.quota.requestFailed")),
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-dashed border-[var(--gh-border-strong,var(--border))] bg-[var(--gh-surface-subtle,var(--muted))] p-3",
        className,
      )}
    >
      <Gauge
        className="mt-0.5 size-4 shrink-0 text-[var(--gh-text-muted,var(--muted-foreground))]"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--gh-text,var(--foreground))]">{t(copy.title)}</p>
        <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">
          {t("ai.quota.usage", {
            used: quota.used,
            limit: quota.limit,
            resetAt: formatExactDateTime(resetAt, { t, locale }),
          })}
        </p>
        {requestType === null ? null : quota.pendingRequest ? (
          <p className="mt-2 text-xs font-medium text-[var(--gh-text-secondary,var(--muted-foreground))]">
            {t("ai.quota.pending")}
          </p>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2 h-8"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={handleRequest}
          >
            {mutation.isPending ? t("ai.quota.requesting") : t("ai.quota.request")}
          </Button>
        )}
      </div>
    </div>
  );
}
