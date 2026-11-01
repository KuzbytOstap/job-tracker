"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/i18n-provider";
import { cn } from "@/lib/utils";
import { PLATFORM_BADGE_CLASSES, customPlatformBadgeClasses } from "@/lib/labels";
import { PLATFORM_LABEL_KEYS } from "@/lib/i18n/label-keys";
import type { Platform } from "@/app/generated/prisma/enums";
import type { CustomPlatformRefDTO } from "@/lib/api-types";

type PlatformBadgeProps = {
  platform: Platform;
  customPlatform?: CustomPlatformRefDTO | null;
  className?: string;
};

export function PlatformBadge({ platform, customPlatform, className }: PlatformBadgeProps) {
  const t = useT();

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        customPlatform ? customPlatformBadgeClasses(customPlatform.colorKey) : PLATFORM_BADGE_CLASSES[platform],
        className,
      )}
    >
      {customPlatform ? customPlatform.name : t(PLATFORM_LABEL_KEYS[platform])}
    </Badge>
  );
}
