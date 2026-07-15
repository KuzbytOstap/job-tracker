import { Skeleton } from "@/components/ui/skeleton";

export function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
