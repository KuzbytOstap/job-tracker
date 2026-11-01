"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASSES } from "@/lib/labels";
import { STATUS_LABEL_KEYS } from "@/lib/i18n/label-keys";
import type { Status } from "@/app/generated/prisma/enums";

type StatusBadgeProps = {
  status: Status;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useT();

  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_BADGE_CLASSES[status], className)}>
      {t(STATUS_LABEL_KEYS[status])}
    </Badge>
  );
}
