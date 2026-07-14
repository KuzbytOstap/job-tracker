import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TestTaskChipProps = {
  done: boolean;
  className?: string;
};

export function TestTaskChip({ done, className }: TestTaskChipProps) {
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
      {done ? "Test task done" : "Test task pending"}
    </Badge>
  );
}
