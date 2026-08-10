"use client";

import { Ban, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequestAiAccess } from "@/hooks/use-request-ai-access";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AiAccessStatus } from "@/app/generated/prisma/enums";

export type LockedAiAccessStatus = Exclude<AiAccessStatus, "APPROVED" | "REJECTED">;

const REQUEST_ERROR_MESSAGE = "Couldn't request AI access. Try again.";

const COPY: Record<LockedAiAccessStatus, { icon: typeof Lock; title: string; description: string }> = {
  NOT_REQUESTED: {
    icon: Lock,
    title: "AI features are locked",
    description: "Request access to unlock AI-powered posting analysis and HR question suggestions.",
  },
  PENDING: {
    icon: Clock,
    title: "AI access request pending",
    description: "Your request is awaiting admin approval.",
  },
  SUSPENDED: {
    icon: Ban,
    title: "AI access is suspended",
    description: "AI features have been disabled for your account.",
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
      onSuccess: () => toast.success("AI access requested."),
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
      <Icon
        className="mt-0.5 size-4 shrink-0 text-[var(--gh-text-muted,var(--muted-foreground))]"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--gh-text,var(--foreground))]">{copy.title}</p>
        <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">{copy.description}</p>
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
            {mutation.isPending ? "Requesting…" : "Request AI access"}
          </Button>
        )}
      </div>
    </div>
  );
}
