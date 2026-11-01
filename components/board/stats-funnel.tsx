"use client";

import { useT } from "@/components/i18n/i18n-provider";
import { FUNNEL_LABEL_KEYS } from "@/lib/i18n/label-keys";
import { buildFunnelStageConfigs } from "@/lib/stats";
import type { StatsResponse } from "@/lib/api-types";

type StatsFunnelProps = {
  stats: StatsResponse;
};

export function StatsFunnel({ stats }: StatsFunnelProps) {
  const t = useT();
  const stages = buildFunnelStageConfigs(stats);

  return (
    <div
      aria-label={t("stats.funnelAriaLabel")}
      className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm"
    >
      {stages.map((stage, index) => (
        <div key={stage.key} className="flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden className="mx-1 text-muted-foreground/50">
              →
            </span>
          )}
          <span className="whitespace-nowrap">
            <span className="text-muted-foreground">{t(FUNNEL_LABEL_KEYS[stage.key])}</span>{" "}
            <span className="font-heading font-semibold tabular-nums">{stage.stage.count}</span>{" "}
            <span className="text-xs text-muted-foreground">({stage.stage.percentage}%)</span>
          </span>
        </div>
      ))}
    </div>
  );
}
