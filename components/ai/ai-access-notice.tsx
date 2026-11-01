"use client";

import { Ban, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequestAiAccess } from "@/hooks/use-request-ai-access";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { useT } from "@/components/i18n/i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { AiAccessStatus } from "@/app/generated/prisma/enums";

export type LockedAiAccessStatus = Exclude<AiAccessStatus, "APPROVED" | "REJECTED">;

const COPY: Record<LockedAiAccessStatus, { icon: typeof Lock; title: MessageKey; description: MessageKey }> = {
  NOT_REQUESTED: {
    icon: Lock,
    title: "ai.access.locked.title",
    description: "ai.access.locked.description",
  },
  PENDING: {
    icon: Clock,
    title: "ai.access.pending.title",
    description: "ai.access.pending.description",
  },
  SUSPENDED: {
    icon: Ban,
    title: "ai.access.suspended.title",
    description: "ai.access.suspended.description",
  },
};

type AiAccessNoticeProps = {
  // Accepts the raw query status, including the pre-load `undefined` — the
  // component itself owns rendering a neutral loading state for it, so no
  // caller has to remember to gate on "is the status loaded yet" before
  // deciding whether it's safe to show a Request-access action.
  status: AiAccessStatus | undefined;
  className?: string;
};

export function AiAccessNotice({ status, className }: AiAccessNoticeProps) {
  const t = useT();
  const mutation = useRequestAiAccess();

  if (status === undefined) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-lg border border-dashed border-[var(--gh-border-strong,var(--border))] bg-[var(--gh-surface-subtle,var(--muted))] p-3",
          className,
        )}
        aria-hidden="true"
      >
        <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    );
  }

  if (status === AiAccessStatus.APPROVED || status === AiAccessStatus.REJECTED) {
    return null;
  }

  const copy = COPY[status];
  const Icon = copy.icon;

  function handleRequest() {
    mutation.mutate(undefined, {
      onSuccess: () => toast.success(t("ai.access.requested")),
      onError: (error) => toast.error(getApiErrorMessage(t, error, "ai.access.requestFailed")),
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-dashed border-[var(--gh-border-strong,var(--border))] bg-[var(--gh-surface-subtle,var(--muted))] p-3",
        className,
      )}
    >
      <Icon
        className="mt-0.5 size-4 shrink-0 text-[var(--gh-text-muted,var(--muted-foreground))]"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--gh-text,var(--foreground))]">{t(copy.title)}</p>
        <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">{t(copy.description)}</p>
        {status === AiAccessStatus.NOT_REQUESTED && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2 h-8"
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={handleRequest}
          >
            {mutation.isPending ? t("ai.access.requesting") : t("ai.access.request")}
          </Button>
        )}
      </div>
    </div>
  );
}
