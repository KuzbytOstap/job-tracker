import { describe, expect, it } from "vitest";
import {
  buildFunnelStage,
  buildFunnelStageConfigs,
  buildStatSummaryCards,
  statPercentage,
} from "@/lib/stats";
import { getStatusPageHref } from "@/lib/board-columns";
import { Status } from "@/app/generated/prisma/enums";
import type { StatsResponse } from "@/lib/api-types";

function stage(count: number, percentage: number) {
  return { count, percentage };
}

const SAMPLE_STATS: StatsResponse = {
  total: 20,
  counts: {
    APPLIED: 8,
    HR_REPLIED: 2,
    HR_CALL: 1,
    TECH_INTERVIEW: 3,
    TEST_TASK: 1,
    OFFER: 2,
    REJECTED: 2,
    IGNORED: 1,
  },
  waitingForReply: 8,
  repliedOrFurther: 12,
  interviewsOrFurther: 6,
  offers: 2,
  funnel: {
    applied: stage(20, 100),
    replied: stage(12, 60),
    interviews: stage(6, 30),
    offers: stage(2, 10),
  },
};

describe("statPercentage", () => {
  it("returns 0 for a zero total instead of dividing by zero", () => {
    expect(statPercentage(0, 0)).toBe(0);
    expect(statPercentage(5, 0)).toBe(0);
  });

  it("computes a rounded percentage to one decimal place", () => {
    expect(statPercentage(1, 3)).toBe(33.3);
    expect(statPercentage(2, 4)).toBe(50);
    expect(statPercentage(6, 20)).toBe(30);
  });
});

describe("buildFunnelStage", () => {
  it("pairs a count with its computed percentage", () => {
    expect(buildFunnelStage(6, 20)).toEqual({ count: 6, percentage: 30 });
  });

  it("handles a zero total safely", () => {
    expect(buildFunnelStage(0, 0)).toEqual({ count: 0, percentage: 0 });
  });
});

describe("buildStatSummaryCards", () => {
  const cards = buildStatSummaryCards(SAMPLE_STATS);

  it("includes the five required summary values", () => {
    expect(cards.map((c) => c.key)).toEqual(["total", "waiting", "replied", "interviews", "offers"]);
    expect(cards.map((c) => c.value)).toEqual([20, 8, 12, 6, 2]);
  });

  it("keeps total non-navigational", () => {
    expect(cards.find((c) => c.key === "total")?.href).toBeNull();
  });

  it("derives navigational hrefs from the shared board-column slugs, not hardcoded routes", () => {
    expect(cards.find((c) => c.key === "waiting")?.href).toBe(getStatusPageHref(Status.APPLIED));
    expect(cards.find((c) => c.key === "replied")?.href).toBe(getStatusPageHref(Status.HR_REPLIED));
    expect(cards.find((c) => c.key === "interviews")?.href).toBe(
      getStatusPageHref(Status.TECH_INTERVIEW),
    );
    expect(cards.find((c) => c.key === "offers")?.href).toBe(getStatusPageHref(Status.OFFER));
  });

  it("resolves every navigational statistic to the intended focused status route", () => {
    expect(cards.find((c) => c.key === "waiting")?.href).toBe("/status/applied");
    expect(cards.find((c) => c.key === "replied")?.href).toBe("/status/hr-replied");
    expect(cards.find((c) => c.key === "interviews")?.href).toBe("/status/tech-interview");
    expect(cards.find((c) => c.key === "offers")?.href).toBe("/status/offer");
  });
});

describe("buildFunnelStageConfigs", () => {
  it("returns the four funnel stages in order with their counts and percentages", () => {
    const configs = buildFunnelStageConfigs(SAMPLE_STATS);
    expect(configs.map((c) => c.key)).toEqual(["applied", "replied", "interviews", "offers"]);
    expect(configs.map((c) => c.stage)).toEqual([
      SAMPLE_STATS.funnel.applied,
      SAMPLE_STATS.funnel.replied,
      SAMPLE_STATS.funnel.interviews,
      SAMPLE_STATS.funnel.offers,
    ]);
  });
});
