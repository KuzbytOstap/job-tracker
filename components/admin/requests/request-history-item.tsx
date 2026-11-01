"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/i18n-provider";
import { AI_REQUEST_STATUS_LABEL_KEYS, AI_REQUEST_TYPE_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { cn } from "@/lib/utils";
import { AI_REQUEST_STATUS_BADGE_CLASSES } from "@/lib/admin-labels";
import { formatRelativeDate } from "@/lib/relative-date";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type RequestHistoryItemProps = {
  request: AdminAiRequestDTO;
};

export function RequestHistoryItem({ request }: RequestHistoryItemProps) {
  const t = useT();

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-sm font-medium text-[var(--gh-text)]">
          {request.user.name ?? request.user.email ?? t("admin.requests.unknownUser")}
        </p>
        <Badge variant="outline" className="border-[var(--gh-border-strong)] text-[var(--gh-text-secondary)]">
          {t(AI_REQUEST_TYPE_LABEL_KEYS[request.type])}
        </Badge>
        <Badge className={cn("border-transparent", AI_REQUEST_STATUS_BADGE_CLASSES[request.status])}>
          {t(AI_REQUEST_STATUS_LABEL_KEYS[request.status])}
        </Badge>
        {request.grantedAmount !== null && (
          <Badge variant="secondary">+{request.grantedAmount}</Badge>
        )}
      </div>
      <p className="text-xs text-[var(--gh-text-muted)]">
        {request.decidedAt
          ? request.decidedByUser
            ? t("admin.requests.historyItem.decidedBy", {
                when: formatRelativeDate(request.decidedAt, new Date(), t),
                name: request.decidedByUser.name ?? request.decidedByUser.email ?? t("admin.requests.historyItem.adminFallback"),
              })
            : t("admin.requests.historyItem.decided", { when: formatRelativeDate(request.decidedAt, new Date(), t) })
          : t("admin.requests.historyItem.notDecided")}
      </p>
      {request.decisionNote && (
        <p className="text-xs text-[var(--gh-text-secondary)] italic">&ldquo;{request.decisionNote}&rdquo;</p>
      )}
    </div>
  );
}
