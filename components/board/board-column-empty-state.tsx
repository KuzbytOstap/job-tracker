import type { BoardColumnConfig } from "@/lib/board-columns";

type BoardColumnEmptyStateProps = {
  column: BoardColumnConfig;
};

export function BoardColumnEmptyState({ column }: BoardColumnEmptyStateProps) {
  const Icon = column.icon;

  return (
    <div className="kanban-empty-state flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 px-4 py-8 text-center">
      <Icon className="size-5 text-muted-foreground/50" />
      <p className="text-xs text-muted-foreground">{column.emptyStateCopy}</p>
    </div>
  );
}
