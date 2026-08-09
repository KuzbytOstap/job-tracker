"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useMoveApplicationToStatus } from "@/hooks/use-move-application-to-status";
import { STATUS_LABELS } from "@/lib/labels";
import { resolveRestoreTargetStatus } from "@/lib/status-transitions";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO } from "@/lib/api-types";

type ConfirmKind = "reject" | "ignore" | "restore-rejected" | "restore-ignored";

type TerminalStatusActionsProps = {
  application: ApplicationDTO;
};

export function TerminalStatusActions({ application }: TerminalStatusActionsProps) {
  const moveMutation = useMoveApplicationToStatus();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  const isStoredRejected = application.status === Status.REJECTED;
  const isStoredIgnored = application.status === Status.IGNORED;
  const subject = `${application.company} — ${application.position}`;

  function commitMove(target: Status, successMessage: string) {
    moveMutation.mutate(
      { applicationId: application.id, targetStatus: target },
      {
        onSuccess: () => {
          setConfirmKind(null);
          toast.success(successMessage);
        },
      },
    );
  }

  function handleConfirm() {
    if (confirmKind === "reject") {
      commitMove(Status.REJECTED, `${subject} marked as rejected`);
    } else if (confirmKind === "ignore") {
      commitMove(Status.IGNORED, `${subject} marked as ignored`);
    } else if (confirmKind === "restore-rejected" || confirmKind === "restore-ignored") {
      const target = resolveRestoreTargetStatus(application);
      commitMove(target, `${subject} restored to ${STATUS_LABELS[target]}`);
    }
  }

  const dialogCopy: Record<
    ConfirmKind,
    { title: string; description: string; confirmLabel: string; destructive: boolean; intent: "neutral" | "warning" | "destructive" }
  > = {
    reject: {
      title: "Mark as rejected?",
      description: `${subject} will be moved to Rejected.`,
      confirmLabel: "Reject",
      destructive: true,
      intent: "destructive",
    },
    ignore: {
      title: "Mark as ignored?",
      description: `${subject} will be moved to Ignored.`,
      confirmLabel: "Ignore",
      destructive: false,
      intent: "warning",
    },
    "restore-rejected": {
      title: "Restore this application?",
      description: `${subject} will be moved out of Rejected back to its previous status.`,
      confirmLabel: "Restore",
      destructive: false,
      intent: "neutral",
    },
    "restore-ignored": {
      title: "Restore this application?",
      description: `${subject} will be moved out of Ignored back to its previous status.`,
      confirmLabel: "Restore",
      destructive: false,
      intent: "neutral",
    },
  };

  const activeCopy = confirmKind ? dialogCopy[confirmKind] : null;

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-secondary,var(--muted))]/60 p-2.5">
      {isStoredRejected ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmKind("restore-rejected")}>
          Restore application
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={moveMutation.isPending}
          onClick={() => setConfirmKind("reject")}
        >
          Reject
        </Button>
      )}

      {isStoredIgnored ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmKind("restore-ignored")}>
          Restore application
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={moveMutation.isPending}
          onClick={() => setConfirmKind("ignore")}
        >
          Ignore
        </Button>
      )}

      <ConfirmActionDialog
        open={confirmKind !== null}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        title={activeCopy?.title ?? ""}
        description={activeCopy?.description ?? ""}
        confirmLabel={activeCopy?.confirmLabel ?? "Confirm"}
        destructive={activeCopy?.destructive ?? false}
        visualVariant="gameHub"
        intent={activeCopy?.intent ?? "neutral"}
        pending={moveMutation.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
