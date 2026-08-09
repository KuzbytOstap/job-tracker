"use client";

import { Ban, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRequestAiAccess } from "@/hooks/use-request-ai-access";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AiAccessStatus } from "@/app/generated/prisma/enums";

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
  status: LockedAiAccessStatus;
  className?: string;
};

export function AiAccessNotice({ status, className }: AiAccessNoticeProps) {
  const mutation = useRequestAiAccess();
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
        {status === "NOT_REQUESTED" && (
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
