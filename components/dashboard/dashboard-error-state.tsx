import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardErrorStateProps = {
  onRetry: () => void;
};

export function DashboardErrorState({ onRetry }: DashboardErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 py-16 text-center">
      <AlertTriangle className="size-8 text-destructive/70" />
      <div className="space-y-1 px-6">
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load your applications. Please try again.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
