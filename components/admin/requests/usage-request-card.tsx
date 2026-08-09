"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisionNoteDialog } from "@/components/admin/requests/decision-note-dialog";
import { GrantAmountDialog } from "@/components/admin/requests/grant-amount-dialog";
import { useDecideAdminAiRequest } from "@/hooks/use-decide-admin-ai-request";
import { ApiError } from "@/lib/api";
import { AI_REQUEST_TYPE_LABELS, USAGE_REQUEST_QUOTA_FIELD } from "@/lib/admin-labels";
import { isUsageRequestStale } from "@/lib/admin-quota";
import { formatRelativeDate } from "@/lib/relative-date";
import type { AdminAiRequestDTO, AdminUserDTO, AiUsageRequestType } from "@/lib/api-types";

type UsageRequestCardProps = {
  request: AdminAiRequestDTO;
  user: AdminUserDTO | undefined;
};

const QUICK_AMOUNTS = [5, 10] as const;

export function UsageRequestCard({ request, user }: UsageRequestCardProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const mutation = useDecideAdminAiRequest();

  const stale = isUsageRequestStale(request.quotaDate);
  const field = USAGE_REQUEST_QUOTA_FIELD[request.type as AiUsageRequestType];
  const usage = user?.usage[field];
  const limit = user?.limits[field];

  function handleQuickApprove(amount: number) {
    mutation.mutate(
      { requestId: request.id, decision: "APPROVED", grantedAmount: amount },
      {
        onSuccess: () => toast.success(`Approved +${amount}`),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Couldn't approve the request. Try again."),
      },
    );
  }

  return (
    <div className="gh-list-skeleton-card flex flex-col gap-3 rounded-xl border border-l-[3px] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-[var(--gh-text)]">
              {request.user.name ?? request.user.email ?? "Unknown user"}
            </p>
            <Badge variant="outline" className="border-[var(--gh-border-strong)] text-[var(--gh-text-secondary)]">
              {AI_REQUEST_TYPE_LABELS[request.type]}
            </Badge>
            {stale && (
              <Badge variant="destructive">
                <Clock data-icon="inline-start" />
                Stale
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-[var(--gh-text-muted)]">{request.user.email}</p>
        </div>
        <p className="shrink-0 text-xs text-[var(--gh-text-muted)]">
          Quota day{" "}
          {request.quotaDate
            ? new Date(request.quotaDate).toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })
            : "unknown"}{" "}
          · requested {formatRelativeDate(request.createdAt)}
        </p>
      </div>

      <p className="text-sm text-[var(--gh-text-secondary)]">
        {usage !== undefined && limit !== undefined ? (
          <>
            Currently used <span className="font-medium text-[var(--gh-text)]">{usage}</span> of{" "}
            <span className="font-medium text-[var(--gh-text)]">{limit}</span> today
          </>
        ) : (
          "Current usage unavailable"
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {!stale &&
          QUICK_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="secondary"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => handleQuickApprove(amount)}
            >
              +{amount}
            </Button>
          ))}
        {!stale && (
          <Button type="button" size="sm" disabled={mutation.isPending} onClick={() => setCustomOpen(true)}>
            Custom…
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => setRejectOpen(true)}
        >
          <X data-icon="inline-start" />
          Reject
        </Button>
      </div>

      {customOpen && <GrantAmountDialog request={request} open onOpenChange={setCustomOpen} />}
      {rejectOpen && (
        <DecisionNoteDialog request={request} decision="REJECTED" open onOpenChange={setRejectOpen} />
      )}
    </div>
  );
}
