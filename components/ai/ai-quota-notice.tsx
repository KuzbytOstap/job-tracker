"use client";

import { Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRequestMoreAiUsage } from "@/hooks/use-request-more-ai-usage";
import { ApiError } from "@/lib/api";
import { formatExactDateTime } from "@/lib/relative-date";
import { AI_QUOTA_REQUEST_TYPE, type AiQuotaReasonCode } from "@/lib/ai-quota";
import { cn } from "@/lib/utils";
import type { AiQuotaStatus } from "@/lib/api-types";

const REQUEST_ERROR_MESSAGE = "Couldn't request more usage. Try again.";

const REASON_COPY: Record<AiQuotaReasonCode, { title: string }> = {
  VACANCY_LIMIT_REACHED: { title: "Daily vacancy analysis limit reached" },
  HR_LIMIT_REACHED: { title: "Daily HR question limit reached" },
  TOKEN_LIMIT_REACHED: { title: "Daily AI token limit reached" },
};

type AiQuotaNoticeProps = {
  reason: AiQuotaReasonCode;
  quota: AiQuotaStatus;
  resetAt: string;
  className?: string;
};

export function AiQuotaNotice({ reason, quota, resetAt, className }: AiQuotaNoticeProps) {
  const mutation = useRequestMoreAiUsage();
  const copy = REASON_COPY[reason];

  function handleRequest() {
    mutation.mutate(AI_QUOTA_REQUEST_TYPE[reason], {
      onSuccess: () => toast.success("Requested more usage."),
      onError: (error) => toast.error(error instanceof ApiError ? error.message : REQUEST_ERROR_MESSAGE),
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
        <p className="text-sm font-medium text-[var(--gh-text,var(--foreground))]">{copy.title}</p>
        <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">
          Used {quota.used} / {quota.limit} today. Resets {formatExactDateTime(resetAt)}.
        </p>
        {quota.pendingRequest ? (
          <p className="mt-2 text-xs font-medium text-[var(--gh-text-secondary,var(--muted-foreground))]">
            More usage requested — awaiting admin approval.
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
            {mutation.isPending ? "Requesting…" : "Request more usage"}
          </Button>
        )}
      </div>
    </div>
  );
}
