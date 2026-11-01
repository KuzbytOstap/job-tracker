"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisionNoteDialog } from "@/components/admin/requests/decision-note-dialog";
import { GrantAmountDialog } from "@/components/admin/requests/grant-amount-dialog";
import { useDecideAdminAiRequest } from "@/hooks/use-decide-admin-ai-request";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { USAGE_REQUEST_QUOTA_FIELD } from "@/lib/admin-labels";
import { AI_REQUEST_TYPE_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { useI18n } from "@/components/i18n/i18n-provider";
import { isUsageRequestStale } from "@/lib/admin-quota";
import { formatRelativeDate } from "@/lib/relative-date";
import type { AdminAiRequestDTO, AdminUserDTO, AiUsageRequestType } from "@/lib/api-types";

type UsageRequestCardProps = {
  request: AdminAiRequestDTO;
  user: AdminUserDTO | undefined;
};

const QUICK_AMOUNTS = [5, 10] as const;

export function UsageRequestCard({ request, user }: UsageRequestCardProps) {
  const { t, rich, locale } = useI18n();
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
        onSuccess: () => toast.success(t("admin.requests.toasts.approvedAmount", { amount })),
        onError: (error) =>
          toast.error(getApiErrorMessage(t, error, "admin.requests.toasts.approveFailed")),
      },
    );
  }

  return (
    <div className="gh-list-skeleton-card flex flex-col gap-3 rounded-xl border border-l-[3px] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-[var(--gh-text)]">
              {request.user.name ?? request.user.email ?? t("admin.requests.unknownUser")}
            </p>
            <Badge variant="outline" className="border-[var(--gh-border-strong)] text-[var(--gh-text-secondary)]">
              {t(AI_REQUEST_TYPE_LABEL_KEYS[request.type])}
            </Badge>
            {stale && (
              <Badge variant="destructive">
                <Clock data-icon="inline-start" />
                {t("admin.requests.stale")}
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-[var(--gh-text-muted)]">{request.user.email}</p>
        </div>
        <p className="shrink-0 text-xs text-[var(--gh-text-muted)]">
          {t("admin.requests.quotaDay", {
            date: request.quotaDate
              ? new Date(request.quotaDate).toLocaleDateString(locale, { dateStyle: "medium", timeZone: "UTC" })
              : t("admin.requests.unknownDate"),
            when: formatRelativeDate(request.createdAt, new Date(), t),
          })}
        </p>
      </div>

      <p className="text-sm text-[var(--gh-text-secondary)]">
        {usage !== undefined && limit !== undefined ? (
          <>
            {rich(
              "admin.requests.currentlyUsed",
              { b: (chunk) => <span className="font-medium text-[var(--gh-text)]">{chunk}</span> },
              { used: usage, limit },
            )}
          </>
        ) : (
          t("admin.requests.usageUnavailable")
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
            {t("admin.requests.custom")}
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
          {t("admin.requests.reject")}
        </Button>
      </div>

      {customOpen && <GrantAmountDialog request={request} open onOpenChange={setCustomOpen} />}
      {rejectOpen && (
        <DecisionNoteDialog request={request} decision="REJECTED" open onOpenChange={setRejectOpen} />
      )}
    </div>
  );
}
