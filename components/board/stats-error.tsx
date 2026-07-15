import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type StatsErrorProps = {
  onRetry: () => void;
};

export function StatsError({ onRetry }: StatsErrorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="size-4 shrink-0 text-destructive/70" />
        Couldn&apos;t load statistics.
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
