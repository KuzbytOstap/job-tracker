import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLATFORM_BADGE_CLASSES, PLATFORM_LABELS, customPlatformBadgeClasses } from "@/lib/labels";
import type { Platform } from "@/app/generated/prisma/enums";
import type { CustomPlatformRefDTO } from "@/lib/api-types";

type PlatformBadgeProps = {
  platform: Platform;
  customPlatform?: CustomPlatformRefDTO | null;
  className?: string;
};

export function PlatformBadge({ platform, customPlatform, className }: PlatformBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        customPlatform ? customPlatformBadgeClasses(customPlatform.colorKey) : PLATFORM_BADGE_CLASSES[platform],
        className,
      )}
    >
      {customPlatform ? customPlatform.name : PLATFORM_LABELS[platform]}
    </Badge>
  );
}
