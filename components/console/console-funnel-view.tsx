"use client";

import { StatsFunnel } from "@/components/board/stats-funnel";
import { StatsSummaryCard } from "@/components/board/stats-summary-card";
import { StatsSkeleton } from "@/components/board/stats-skeleton";
import { StatsError } from "@/components/board/stats-error";
import { buildStatSummaryCards } from "@/lib/stats";
import type { StatsResponse } from "@/lib/api-types";

type ConsoleFunnelViewProps = {
  stats: StatsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
};

export function ConsoleFunnelView({ stats, isLoading, isError, onRetry }: ConsoleFunnelViewProps) {
  return (
    <div className="flex flex-col gap-4 px-4 pb-6 sm:px-6">
      {isError ? (
        <StatsError onRetry={onRetry} />
      ) : isLoading || !stats ? (
        <StatsSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {buildStatSummaryCards(stats).map((card) => (
              <StatsSummaryCard key={card.key} card={card} />
            ))}
          </div>
          <StatsFunnel stats={stats} />
        </>
      )}
    </div>
  );
}
