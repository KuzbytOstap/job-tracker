import { Skeleton } from "@/components/ui/skeleton";

function SkeletonColumn() {
  return (
    <div className="flex h-[420px] w-[85vw] max-w-[340px] shrink-0 flex-col gap-3 rounded-xl bg-muted/40 p-3 sm:w-[300px]">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

const SKELETON_COLUMN_COUNT = 4;

export function BoardSkeleton() {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="flex gap-4 px-4 sm:px-6">
        {Array.from({ length: SKELETON_COLUMN_COUNT }).map((_, index) => (
          <SkeletonColumn key={index} />
        ))}
      </div>
    </div>
  );
}
