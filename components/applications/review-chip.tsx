"use client";

import { PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/i18n-provider";
import { REVIEW_REASON_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { cn } from "@/lib/utils";
import type { ReviewReason } from "@/lib/review-reasons";

type ReviewChipProps = {
  reasons: ReviewReason[];
  className?: string;
};

export function ReviewChip({ reasons, className }: ReviewChipProps) {
  const t = useT();

  if (reasons.length === 0) return null;

  const summary = reasons.map((reason) => t(REVIEW_REASON_LABEL_KEYS[reason])).join(", ");

  return (
    <Badge
      variant="outline"
      title={summary}
      className={cn(
        "gap-1 border-transparent bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
        className,
      )}
    >
      <PenLine aria-hidden className="size-3" />
      {t("review.chip")}
      <span className="sr-only">: {summary}</span>
    </Badge>
  );
}
