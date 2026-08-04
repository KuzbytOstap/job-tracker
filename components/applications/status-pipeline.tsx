"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useMoveApplicationToStatus } from "@/hooks/use-move-application-to-status";
import { STATUS_LABELS } from "@/lib/labels";
import {
  PRIMARY_PIPELINE_STATUSES,
  isForwardPipelineMove,
  isPrimaryPipelineStatus,
} from "@/lib/status-transitions";
import { cn } from "@/lib/utils";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO } from "@/lib/api-types";

type StatusPipelineProps = {
  application: ApplicationDTO;
};

export function StatusPipeline({ application }: StatusPipelineProps) {
  const moveMutation = useMoveApplicationToStatus();
  const [pendingStep, setPendingStep] = useState<Status | null>(null);

  const interactive = isPrimaryPipelineStatus(application.status);
  const reachedStatuses = new Set<Status>(application.statusChanges.map((change) => change.toStatus));
  reachedStatuses.add(Status.APPLIED);
  if (interactive) reachedStatuses.add(application.status);

  function commitMove(target: Status) {
    moveMutation.mutate(
      { applicationId: application.id, targetStatus: target },
      {
        onSuccess: () => {
          setPendingStep(null);
          toast.success(`Moved to ${STATUS_LABELS[target]}`);
        },
      },
    );
  }

  function handleStepActivate(step: Status) {
    if (!interactive || moveMutation.isPending || step === application.status) return;

    if (isForwardPipelineMove(application.status, step)) {
      commitMove(step);
    } else {
      setPendingStep(step);
    }
  }

  return (
    <div>
      <ol
        role="list"
        aria-label="Application pipeline"
        className="flex items-start"
      >
        {PRIMARY_PIPELINE_STATUSES.map((step, index) => {
          const isCurrent = step === application.status;
          const isPast = !isCurrent && reachedStatuses.has(step);
          const isLast = index === PRIMARY_PIPELINE_STATUSES.length - 1;

          return (
            <li key={step} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${STATUS_LABELS[step]}${isCurrent ? " (current)" : isPast ? " (reached)" : ""}`}
                  disabled={!interactive || moveMutation.isPending}
                  tabIndex={interactive ? 0 : -1}
                  onClick={() => handleStepActivate(step)}
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default",
                    isCurrent &&
                      "border-[var(--gh-accent,var(--primary))] bg-[var(--gh-accent,var(--primary))] text-primary-foreground",
                    isPast &&
                      !isCurrent &&
                      "border-[var(--gh-accent,var(--primary))]/40 bg-[var(--gh-accent,var(--primary))]/10 text-[var(--gh-accent,var(--primary))]",
                    !isCurrent && !isPast && "border-border bg-background text-muted-foreground",
                    interactive &&
                      !moveMutation.isPending &&
                      "cursor-pointer hover:border-[var(--gh-accent,var(--primary))]/60",
                  )}
                >
                  {isPast && !isCurrent ? <Check className="size-3" /> : index + 1}
                </button>
                <span
                  className={cn(
                    "max-w-14 text-center text-[0.65rem] leading-tight",
                    isCurrent
                      ? "font-medium text-[var(--gh-text,var(--foreground))]"
                      : "text-[var(--gh-text-muted,var(--muted-foreground))]",
                  )}
                >
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1 h-px flex-1 self-start mt-3",
                    isPast ? "bg-[var(--gh-accent,var(--primary))]/40" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">
        {moveMutation.isPending ? "Updating status…" : ""}
      </p>

      <ConfirmActionDialog
        open={pendingStep !== null}
        onOpenChange={(open) => !open && setPendingStep(null)}
        title={pendingStep ? `Move back to ${STATUS_LABELS[pendingStep]}?` : ""}
        description={
          pendingStep
            ? `This moves ${application.company} — ${application.position} back to ${STATUS_LABELS[pendingStep]}.`
            : ""
        }
        confirmLabel="Move back"
        pending={moveMutation.isPending}
        onConfirm={() => pendingStep && commitMove(pendingStep)}
      />
    </div>
  );
}
