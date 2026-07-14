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
    return <p className="text-sm text-muted-foreground">No status changes yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {statusChanges.map((change) => {
        const destination = BOARD_COLUMNS_BY_STATUS[change.toStatus];
        return (
          <li key={change.id} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", destination.dotClassName)}
            />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="text-muted-foreground">{STATUS_LABELS[change.fromStatus]}</span>
                <span className="mx-1.5 text-muted-foreground/60">→</span>
                <span className="font-medium">{STATUS_LABELS[change.toStatus]}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(change.changedAt), "d MMM yyyy, HH:mm")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
