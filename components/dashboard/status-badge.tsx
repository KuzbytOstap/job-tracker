import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/labels";
import type { Status } from "@/app/generated/prisma/enums";

type StatusBadgeProps = {
  status: Status;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_BADGE_CLASSES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
