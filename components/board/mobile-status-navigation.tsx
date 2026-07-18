"use client";

import { cn } from "@/lib/utils";
import type { MobileStatusCount } from "@/lib/mobile-pipeline";
import type { Status } from "@/app/generated/prisma/enums";

type MobileStatusNavigationProps = {
  statusCounts: MobileStatusCount[];
  totalCount: number;
  selected: Status | "ALL";
  onSelect: (status: Status | "ALL") => void;
};

export function MobileStatusNavigation({
  statusCounts,
  totalCount,
  selected,
  onSelect,
}: MobileStatusNavigationProps) {
  return (
    <div
      role="group"
      aria-label="Filter applications by status"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:thin]"
    >
      <StatusNavigationChip
        label="All"
        count={totalCount}
        isSelected={selected === "ALL"}
        onClick={() => onSelect("ALL")}
      />
      {statusCounts.map(({ column, count }) => (
        <StatusNavigationChip
          key={column.status}
          label={column.label}
          count={count}
          dotClassName={column.dotClassName}
          isSelected={selected === column.status}
          onClick={() => onSelect(column.status)}
        />
      ))}
    </div>
  );
}

type StatusNavigationChipProps = {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  dotClassName?: string;
};

function StatusNavigationChip({
  label,
  count,
  isSelected,
  onClick,
  dotClassName,
}: StatusNavigationChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
      )}
    >
      {dotClassName && (
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            isSelected ? "bg-primary-foreground" : dotClassName,
          )}
        />
      )}
      {label}
      <span
        className={cn(
          "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] tabular-nums",
          isSelected ? "bg-primary-foreground/20" : "bg-background text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
