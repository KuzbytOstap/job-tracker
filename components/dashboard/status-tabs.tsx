"use client";

import { motion } from "motion/react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_TAB_ORDER, type StatusFilter } from "@/lib/labels";

type StatusTabsProps = {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  counts: Partial<Record<StatusFilter, number>>;
};

export function StatusTabs({ value, onChange, counts }: StatusTabsProps) {
  return (
    <ScrollArea className="w-full">
      <div
        role="tablist"
        aria-label="Filter applications by status"
        className="flex items-center gap-1.5 px-4 py-2 sm:px-6"
      >
        {STATUS_TAB_ORDER.map((tab) => {
          const isActive = tab === value;
          const count = counts[tab] ?? 0;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="status-tab-indicator"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              )}
              <span className="relative z-10">{STATUS_LABELS[tab]}</span>
              <span
                className={cn(
                  "relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] tabular-nums",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="h-1.5 opacity-0 transition-opacity hover:opacity-100" />
    </ScrollArea>
  );
}
