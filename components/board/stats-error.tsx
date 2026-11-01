"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/i18n-provider";

type StatsErrorProps = {
  onRetry: () => void;
};

export function StatsError({ onRetry }: StatsErrorProps) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="size-4 shrink-0 text-destructive/70" />
        {t("stats.loadFailed")}
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
