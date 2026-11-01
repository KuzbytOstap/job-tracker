import { PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REVIEW_REASON_LABELS, type ReviewReason } from "@/lib/review-reasons";

type ReviewChipProps = {
  reasons: ReviewReason[];
  className?: string;
};

export function ReviewChip({ reasons, className }: ReviewChipProps) {
  if (reasons.length === 0) return null;

  const summary = reasons.map((reason) => REVIEW_REASON_LABELS[reason]).join(", ");

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
      Needs details
      <span className="sr-only">: {summary}</span>
    </Badge>
  );
}
