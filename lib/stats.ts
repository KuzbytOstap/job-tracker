import { Status } from "@/app/generated/prisma/enums";
import { getStatusPageHref } from "@/lib/board-columns";
import type { FunnelStage, StatsResponse } from "@/lib/api-types";

export function statPercentage(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((count / total) * 1000) / 10;
}

export function buildFunnelStage(count: number, total: number): FunnelStage {
  return { count, percentage: statPercentage(count, total) };
}

export type StatSummaryKey = "total" | "waiting" | "replied" | "interviews" | "offers";

export type StatSummaryCardConfig = {
  key: StatSummaryKey;
  label: string;
  value: number;
  href: string | null;
};

export function buildStatSummaryCards(stats: StatsResponse): StatSummaryCardConfig[] {
  return [
    { key: "total", label: "Total applications", value: stats.total, href: null },
    {
      key: "waiting",
      label: "Waiting for reply",
      value: stats.waitingForReply,
      href: getStatusPageHref(Status.APPLIED),
    },
    {
      key: "replied",
      label: "Replied or further",
      value: stats.repliedOrFurther,
      href: getStatusPageHref(Status.HR_REPLIED),
    },
    {
      key: "interviews",
      label: "Interviews or further",
      value: stats.interviewsOrFurther,
      href: getStatusPageHref(Status.TECH_INTERVIEW),
    },
    {
      key: "offers",
      label: "Offers",
      value: stats.offers,
      href: getStatusPageHref(Status.OFFER),
    },
  ];
}

export type FunnelStageKey = "applied" | "replied" | "interviews" | "offers";

export type FunnelStageConfig = {
  key: FunnelStageKey;
  label: string;
  stage: FunnelStage;
};

export function buildFunnelStageConfigs(stats: StatsResponse): FunnelStageConfig[] {
  return [
    { key: "applied", label: "Applied", stage: stats.funnel.applied },
    { key: "replied", label: "Replied", stage: stats.funnel.replied },
    { key: "interviews", label: "Interviews", stage: stats.funnel.interviews },
    { key: "offers", label: "Offers", stage: stats.funnel.offers },
  ];
}
