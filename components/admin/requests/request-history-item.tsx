import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AI_REQUEST_STATUS_BADGE_CLASSES, AI_REQUEST_STATUS_LABELS, AI_REQUEST_TYPE_LABELS } from "@/lib/admin-labels";
import { formatRelativeDate } from "@/lib/relative-date";
import type { AdminAiRequestDTO } from "@/lib/api-types";

type RequestHistoryItemProps = {
  request: AdminAiRequestDTO;
};

export function RequestHistoryItem({ request }: RequestHistoryItemProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-sm font-medium text-[var(--gh-text)]">
          {request.user.name ?? request.user.email ?? "Unknown user"}
        </p>
        <Badge variant="outline" className="border-[var(--gh-border-strong)] text-[var(--gh-text-secondary)]">
          {AI_REQUEST_TYPE_LABELS[request.type]}
        </Badge>
        <Badge className={cn("border-transparent", AI_REQUEST_STATUS_BADGE_CLASSES[request.status])}>
          {AI_REQUEST_STATUS_LABELS[request.status]}
        </Badge>
        {request.grantedAmount !== null && (
          <Badge variant="secondary">+{request.grantedAmount}</Badge>
        )}
      </div>
      <p className="text-xs text-[var(--gh-text-muted)]">
        {request.decidedAt ? `Decided ${formatRelativeDate(request.decidedAt)}` : "Not yet decided"}
        {request.decidedByUser && ` by ${request.decidedByUser.name ?? request.decidedByUser.email ?? "admin"}`}
      </p>
      {request.decisionNote && (
        <p className="text-xs text-[var(--gh-text-secondary)] italic">&ldquo;{request.decisionNote}&rdquo;</p>
      )}
    </div>
  );
}
