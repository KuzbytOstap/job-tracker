import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardSkeletonProps = {
  visualVariant?: "default" | "gameHub";
};

function SkeletonCard({ isGameHub }: { isGameHub: boolean }) {
  return (
    <Card className={cn(isGameHub && "gh-list-skeleton-card")}>
      <CardContent className={cn("flex flex-col gap-2.5", isGameHub && "kanban-card-content")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {isGameHub && <Skeleton className="size-7 shrink-0 rounded-lg" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

const SKELETON_GROUPS = [2, 3];

export function DashboardSkeleton({ visualVariant = "default" }: DashboardSkeletonProps) {
  const isGameHub = visualVariant === "gameHub";

  return (
    <div className="flex flex-col gap-6">
      {SKELETON_GROUPS.map((count, groupIndex) => (
        <div key={groupIndex} className="flex flex-col gap-2.5">
          <Skeleton className={cn("h-4 w-20", isGameHub && "gh-list-skeleton-heading")} />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: count }).map((_, index) => (
              <SkeletonCard key={index} isGameHub={isGameHub} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
