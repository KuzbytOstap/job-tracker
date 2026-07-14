import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusPageHref, type BoardColumnConfig } from "@/lib/board-columns";

type KanbanColumnHeaderProps = {
  column: BoardColumnConfig;
  count: number;
};

export function KanbanColumnHeader({ column, count }: KanbanColumnHeaderProps) {
  const Icon = column.icon;

  return (
    <Link
      href={getStatusPageHref(column.status)}
      className="group flex shrink-0 items-center gap-2 rounded-t-xl px-3.5 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className={cn("size-2 shrink-0 rounded-full", column.dotClassName)} />
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{column.label}</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[0.7rem] tabular-nums text-muted-foreground group-hover:bg-background">
        {count}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
