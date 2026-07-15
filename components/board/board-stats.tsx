"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatsSummaryCard } from "@/components/board/stats-summary-card";
import { StatsFunnel } from "@/components/board/stats-funnel";
import { StatsSkeleton } from "@/components/board/stats-skeleton";
import { StatsError } from "@/components/board/stats-error";
import { useStatsQuery } from "@/hooks/use-stats";
import { buildStatSummaryCards } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function BoardStats() {
  const [open, setOpen] = useState(true);
  const statsQuery = useStatsQuery();

  return (
    <section
      aria-label="Application statistics"
      className="mx-auto w-full max-w-[1100px] px-4 pt-4 sm:px-6"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-1 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Statistics
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none data-[ending-style]:h-0 data-[starting-style]:h-0">
          <div className="flex flex-col gap-3 pt-1 pb-2">
            {statsQuery.isError ? (
              <StatsError onRetry={() => statsQuery.refetch()} />
            ) : statsQuery.isPending ? (
              <StatsSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                  {buildStatSummaryCards(statsQuery.data).map((card) => (
                    <StatsSummaryCard key={card.key} card={card} />
                  ))}
                </div>
                <StatsFunnel stats={statsQuery.data} />
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
