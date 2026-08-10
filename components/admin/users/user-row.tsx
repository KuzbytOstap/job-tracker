"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { UserLimitsDialog } from "@/components/admin/users/user-limits-dialog";
import { useSuspendAdminUser } from "@/hooks/use-suspend-admin-user";
import { useRestoreAdminUser } from "@/hooks/use-restore-admin-user";
import { ApiError } from "@/lib/api";
import { AI_ACCESS_STATUS_BADGE_CLASSES, AI_ACCESS_STATUS_LABELS } from "@/lib/admin-labels";
import { describeUserLimit, type QuotaField } from "@/lib/admin-limits";
import { cn } from "@/lib/utils";
import { AiAccessStatus } from "@/app/generated/prisma/enums";
import type { AdminUserDTO, AiGlobalLimitsDTO } from "@/lib/api-types";

type UserRowProps = {
  user: AdminUserDTO;
  globalLimits: AiGlobalLimitsDTO | undefined;
};

const GLOBAL_KEY: Record<QuotaField, Exclude<keyof AiGlobalLimitsDTO, "updatedAt">> = {
  vacancy: "vacancyGenerationLimit",
  hr: "hrGenerationLimit",
  tokens: "tokenLimit",
};

function QuotaCell({ user, globalLimits, field }: { user: AdminUserDTO; globalLimits: AiGlobalLimitsDTO | undefined; field: QuotaField }) {
  const used = user.usage[field];
  const effective = user.limits[field];
  const override = user.overrides[field];
  const globalDefault = globalLimits ? globalLimits[GLOBAL_KEY[field]] : override ?? effective;
  const { base, bonus, hasOverride, hasBonus } = describeUserLimit(effective, override, globalDefault);

  return (
    <td className="px-3 py-2.5 align-top text-sm whitespace-nowrap tabular-nums">
      <span className={cn(used >= effective && effective > 0 ? "font-semibold text-[var(--gh-warning)]" : "text-[var(--gh-text)]")}>
        {used}
      </span>
      <span className="text-[var(--gh-text-muted)]"> / {effective}</span>
      {(hasOverride || hasBonus) && (
        <div className="text-[10px] leading-tight text-[var(--gh-text-muted)]">
          {hasOverride ? `override ${base}` : `default ${base}`}
          {hasBonus ? ` · +${bonus} today` : ""}
        </div>
      )}
    </td>
  );
}

export function UserRow({ user, globalLimits }: UserRowProps) {
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<"suspend" | "restore" | null>(null);
  const suspendMutation = useSuspendAdminUser();
  const restoreMutation = useRestoreAdminUser();

  const isMutating = suspendMutation.isPending || restoreMutation.isPending;
  const canSuspend = user.aiAccessStatus === AiAccessStatus.APPROVED;
  const canRestore = user.aiAccessStatus === AiAccessStatus.SUSPENDED;

  function handleConfirm() {
    if (isMutating) return;
    const mutation = confirmOpen === "suspend" ? suspendMutation : restoreMutation;
    mutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(confirmOpen === "suspend" ? "AI access suspended" : "AI access restored");
        setConfirmOpen(null);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "Couldn't update AI access. Try again.");
        setConfirmOpen(null);
      },
    });
  }

  return (
    <tr className="border-b border-[var(--gh-border)] last:border-b-0">
      <td className="px-3 py-2.5 align-top">
        <p className="truncate text-sm font-medium text-[var(--gh-text)]">{user.name ?? "—"}</p>
        <p className="truncate text-xs text-[var(--gh-text-muted)]">{user.email}</p>
      </td>
      <td className="px-3 py-2.5 align-top whitespace-nowrap">
        <div className="flex flex-col items-start gap-1.5">
          <Badge className={cn("border-transparent", AI_ACCESS_STATUS_BADGE_CLASSES[user.aiAccessStatus])}>
            {AI_ACCESS_STATUS_LABELS[user.aiAccessStatus]}
          </Badge>
          {canSuspend && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isMutating}
              onClick={() => setConfirmOpen("suspend")}
            >
              <Pause data-icon="inline-start" />
              Suspend
            </Button>
          )}
          {canRestore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isMutating}
              onClick={() => setConfirmOpen("restore")}
            >
              <Play data-icon="inline-start" />
              Restore
            </Button>
          )}
        </div>
      </td>
      <QuotaCell user={user} globalLimits={globalLimits} field="vacancy" />
      <QuotaCell user={user} globalLimits={globalLimits} field="hr" />
      <QuotaCell user={user} globalLimits={globalLimits} field="tokens" />
      <td className="px-3 py-2.5 align-top whitespace-nowrap">
        <Button type="button" variant="outline" size="sm" onClick={() => setLimitsOpen(true)}>
          <Settings2 data-icon="inline-start" />
          Edit limits
        </Button>
      </td>

      <UserLimitsDialog user={user} globalLimits={globalLimits} open={limitsOpen} onOpenChange={setLimitsOpen} />
      <ConfirmActionDialog
        open={confirmOpen !== null}
        onOpenChange={(open) => !open && setConfirmOpen(null)}
        title={confirmOpen === "suspend" ? "Suspend AI access?" : "Restore AI access?"}
        description={
          confirmOpen === "suspend"
            ? `${user.name ?? user.email ?? "This user"} will immediately lose access to AI features.`
            : `${user.name ?? user.email ?? "This user"} will regain access to AI features, subject to their quotas.`
        }
        confirmLabel={confirmOpen === "suspend" ? "Suspend" : "Restore"}
        intent={confirmOpen === "suspend" ? "warning" : "neutral"}
        visualVariant="gameHub"
        pending={isMutating}
        onConfirm={handleConfirm}
      />
    </tr>
  );
}
