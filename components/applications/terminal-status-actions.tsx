"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useMoveApplicationToStatus } from "@/hooks/use-move-application-to-status";
import { STATUS_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { useT } from "@/components/i18n/i18n-provider";
import { resolveRestoreTargetStatus } from "@/lib/status-transitions";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO } from "@/lib/api-types";

type ConfirmKind = "reject" | "ignore" | "restore-rejected" | "restore-ignored";

type TerminalStatusActionsProps = {
  application: ApplicationDTO;
};

export function TerminalStatusActions({ application }: TerminalStatusActionsProps) {
  const t = useT();
  const moveMutation = useMoveApplicationToStatus();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);

  const isStoredRejected = application.status === Status.REJECTED;
  const isStoredIgnored = application.status === Status.IGNORED;
  const subject = `${application.company}, ${application.position}`;

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
      commitMove(Status.REJECTED, t("terminal.reject.done", { subject }));
    } else if (confirmKind === "ignore") {
      commitMove(Status.IGNORED, t("terminal.ignore.done", { subject }));
    } else if (confirmKind === "restore-rejected" || confirmKind === "restore-ignored") {
      const target = resolveRestoreTargetStatus(application);
      commitMove(target, t("terminal.restoreDialog.done", { subject, status: t(STATUS_LABEL_KEYS[target]) }));
    }
  }

  const dialogCopy: Record<
    ConfirmKind,
    { title: string; description: string; confirmLabel: string; destructive: boolean; intent: "neutral" | "warning" | "destructive" }
  > = {
    reject: {
      title: t("terminal.reject.title"),
      description: t("terminal.reject.description", { subject, status: t(STATUS_LABEL_KEYS.REJECTED) }),
      confirmLabel: t("terminal.reject.button"),
      destructive: true,
      intent: "destructive",
    },
    ignore: {
      title: t("terminal.ignore.title"),
      description: t("terminal.ignore.description", { subject, status: t(STATUS_LABEL_KEYS.IGNORED) }),
      confirmLabel: t("terminal.ignore.button"),
      destructive: false,
      intent: "warning",
    },
    "restore-rejected": {
      title: t("terminal.restoreDialog.title"),
      description: t("terminal.restoreDialog.description", { subject, status: t(STATUS_LABEL_KEYS.REJECTED) }),
      confirmLabel: t("terminal.restoreDialog.confirm"),
      destructive: false,
      intent: "neutral",
    },
    "restore-ignored": {
      title: t("terminal.restoreDialog.title"),
      description: t("terminal.restoreDialog.description", { subject, status: t(STATUS_LABEL_KEYS.IGNORED) }),
      confirmLabel: t("terminal.restoreDialog.confirm"),
      destructive: false,
      intent: "neutral",
    },
  };

  const activeCopy = confirmKind ? dialogCopy[confirmKind] : null;

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--gh-border,var(--border))] bg-[var(--gh-surface-secondary,var(--muted))]/60 p-2.5">
      {isStoredRejected ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmKind("restore-rejected")}>
          {t("terminal.restore")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={moveMutation.isPending}
          onClick={() => setConfirmKind("reject")}
        >
          {t("terminal.reject.button")}
        </Button>
      )}

      {isStoredIgnored ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmKind("restore-ignored")}>
          {t("terminal.restore")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={moveMutation.isPending}
          onClick={() => setConfirmKind("ignore")}
        >
          {t("terminal.ignore.button")}
        </Button>
      )}

      <ConfirmActionDialog
        open={confirmKind !== null}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        title={activeCopy?.title ?? ""}
        description={activeCopy?.description ?? ""}
        confirmLabel={activeCopy?.confirmLabel ?? t("common.confirm")}
        destructive={activeCopy?.destructive ?? false}
        visualVariant="gameHub"
        intent={activeCopy?.intent ?? "neutral"}
        pending={moveMutation.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
