import { format } from "date-fns";
import { STATUS_LABELS } from "@/lib/labels";
import { BOARD_COLUMNS_BY_STATUS } from "@/lib/board-columns";
import { cn } from "@/lib/utils";
import type { StatusChangeDTO } from "@/lib/api-types";

type StatusHistoryProps = {
  statusChanges: StatusChangeDTO[];
};

export function StatusHistory({ statusChanges }: StatusHistoryProps) {
  if (statusChanges.length === 0) {
    return (
      <p className="text-sm text-[var(--gh-text-muted,var(--muted-foreground))]">No status changes yet.</p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-3.5 pl-0.5">
      {statusChanges.map((change, index) => {
        const destination = BOARD_COLUMNS_BY_STATUS[change.toStatus];
        const isLast = index === statusChanges.length - 1;
        return (
          <li key={change.id} className="relative flex items-start gap-2.5">
            {!isLast && (
              <span
                aria-hidden
                className="absolute top-3 left-[3px] h-[calc(100%-0.25rem)] w-px bg-[var(--gh-border,var(--border))]"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "z-10 mt-1.5 size-2 shrink-0 rounded-full ring-2 ring-[var(--gh-surface,var(--popover))]",
                destination.dotClassName,
              )}
            />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="text-[var(--gh-text-muted,var(--muted-foreground))]">
                  {STATUS_LABELS[change.fromStatus]}
                </span>
                <span className="mx-1.5 text-[var(--gh-text-muted,var(--muted-foreground))]/60">→</span>
                <span className="font-medium text-[var(--gh-text,var(--foreground))]">
                  {STATUS_LABELS[change.toStatus]}
                </span>
              </p>
              <p className="text-xs text-[var(--gh-text-muted,var(--muted-foreground))]">
                {format(new Date(change.changedAt), "d MMM yyyy, HH:mm")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
