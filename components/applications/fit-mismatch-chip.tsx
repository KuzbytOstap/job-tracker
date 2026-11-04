"use client";

import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type FitMismatchChipProps = {
  count: number | null | undefined;
  className?: string;
};

export function FitMismatchChip({ count, className }: FitMismatchChipProps) {
  const t = useT();

  if (!count || count <= 0) return null;

  const label = t("fit.mismatchCount", { count });

  return (
    <Badge
      variant="outline"
      title={label}
      className={cn(
        "gap-1 border-transparent bg-red-100 text-red-800 tabular-nums dark:bg-red-400/15 dark:text-red-300",
        className,
      )}
    >
      <TriangleAlert aria-hidden className="size-3" />
      <span aria-hidden>{count}</span>
      <span className="sr-only">{label}</span>
    </Badge>
  );
}
