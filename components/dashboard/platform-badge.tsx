import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLATFORM_BADGE_CLASSES, PLATFORM_LABELS } from "@/lib/labels";
import type { Platform } from "@/app/generated/prisma/enums";

type PlatformBadgeProps = {
  platform: Platform;
  className?: string;
};

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", PLATFORM_BADGE_CLASSES[platform], className)}
    >
      {PLATFORM_LABELS[platform]}
    </Badge>
  );
}
