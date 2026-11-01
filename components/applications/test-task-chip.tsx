"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";

type TestTaskChipProps = {
  done: boolean;
  className?: string;
};

export function TestTaskChip({ done, className }: TestTaskChipProps) {
  const t = useT();

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        done
          ? "bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
        className,
      )}
    >
      {done ? t("testTask.chipDone") : t("testTask.chipPending")}
    </Badge>
  );
}
