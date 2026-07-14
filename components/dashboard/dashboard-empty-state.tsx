import { Inbox, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DashboardEmptyVariant = "all" | "filtered" | "search";

type DashboardEmptyStateProps = {
  variant: DashboardEmptyVariant;
  searchQuery?: string;
  onAddClick?: () => void;
};

export function DashboardEmptyState({ variant, searchQuery, onAddClick }: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      {variant === "search" ? (
        <SearchX className="size-8 text-muted-foreground/60" />
      ) : (
        <Inbox className="size-8 text-muted-foreground/60" />
      )}
      <div className="space-y-1 px-6">
        <p className="text-sm font-medium">
          {variant === "all" && "No applications yet"}
          {variant === "filtered" && "Nothing here yet"}
          {variant === "search" && `No results for "${searchQuery}"`}
        </p>
        <p className="text-sm text-muted-foreground">
          {variant === "all" && "Start tracking your job search by adding your first application."}
          {variant === "filtered" && "Applications matching this status will show up here."}
          {variant === "search" && "Try a different company or position."}
        </p>
      </div>
      {variant === "all" && onAddClick && (
        <Button onClick={onAddClick} className="mt-1">
          Add your first application
        </Button>
      )}
    </div>
  );
}
