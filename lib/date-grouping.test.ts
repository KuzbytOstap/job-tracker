import { describe, expect, it } from "vitest";
import {
  groupApplicationsByAppliedDate,
  resolveDateGroupKey,
  type GroupableApplication,
} from "@/lib/date-grouping";

const NOW = new Date(2026, 6, 14, 15, 0, 0);

type TestApplication = GroupableApplication;

function app(
  id: string,
  company: string,
  appliedAt: Date,
  lastActivityAt: Date = appliedAt,
): TestApplication {
  return { id, company, appliedAt, lastActivityAt };
}

describe("resolveDateGroupKey", () => {
  it("classifies the same calendar day as today", () => {
    expect(resolveDateGroupKey(new Date(2026, 6, 14, 8, 0, 0), NOW)).toBe("today");
  });

  it("classifies the previous calendar day as yesterday", () => {
    expect(resolveDateGroupKey(new Date(2026, 6, 13, 23, 59, 59), NOW)).toBe("yesterday");
  });

  it("classifies two calendar days back as twoDaysAgo", () => {
    expect(resolveDateGroupKey(new Date(2026, 6, 12, 0, 1, 0), NOW)).toBe("twoDaysAgo");
  });

  it("classifies anything older as earlier", () => {
    expect(resolveDateGroupKey(new Date(2026, 6, 1, 9, 0, 0), NOW)).toBe("earlier");
  });

  it("uses local calendar-day boundaries, not a rolling 24h window, around midnight", () => {
    const justAfterMidnight = new Date(2026, 6, 14, 0, 0, 1);

    const oneSecondBeforeMidnight = new Date(2026, 6, 13, 23, 59, 59);
    expect(resolveDateGroupKey(oneSecondBeforeMidnight, justAfterMidnight)).toBe("yesterday");

    const exactlyMidnightToday = new Date(2026, 6, 14, 0, 0, 0);
    expect(resolveDateGroupKey(exactlyMidnightToday, justAfterMidnight)).toBe("today");
  });

  it("treats a date less than a day old but crossing midnight as yesterday, not today", () => {
    const lateLastNight = new Date(2026, 6, 13, 23, 0, 0);
    const earlyThisMorning = new Date(2026, 6, 14, 1, 0, 0);
    expect(resolveDateGroupKey(lateLastNight, earlyThisMorning)).toBe("yesterday");
  });
});

describe("groupApplicationsByAppliedDate", () => {
  const today1 = app("today-1", "Zeta", new Date(2026, 6, 14, 8, 0, 0), new Date(2026, 6, 14, 10, 0, 0));
  const today2 = app("today-2", "Alpha", new Date(2026, 6, 14, 13, 0, 0), new Date(2026, 6, 14, 14, 0, 0));
  const yesterday1 = app("yesterday-1", "Beta", new Date(2026, 6, 13, 9, 0, 0), new Date(2026, 6, 13, 20, 0, 0));
  const twoDaysAgo1 = app(
    "two-days-1",
    "Gamma",
    new Date(2026, 6, 12, 9, 0, 0),
    new Date(2026, 6, 14, 9, 0, 0),
  );
  const earlier1 = app("earlier-1", "Delta", new Date(2026, 6, 1, 9, 0, 0), new Date(2026, 6, 5, 9, 0, 0));

  const allApplications = [today1, today2, yesterday1, twoDaysAgo1, earlier1];

  it("orders groups Today -> Yesterday -> 2 days ago -> Earlier for newest sort", () => {
    const groups = groupApplicationsByAppliedDate(allApplications, "newest", NOW);
    expect(groups.map((g) => g.key)).toEqual(["today", "yesterday", "twoDaysAgo", "earlier"]);
  });

  it("orders groups Earlier -> 2 days ago -> Yesterday -> Today for oldest sort", () => {
    const groups = groupApplicationsByAppliedDate(allApplications, "oldest", NOW);
    expect(groups.map((g) => g.key)).toEqual(["earlier", "twoDaysAgo", "yesterday", "today"]);
  });

  it("keeps newest-first group order for activity and company sorts", () => {
    const activityGroups = groupApplicationsByAppliedDate(allApplications, "activity", NOW);
    expect(activityGroups.map((g) => g.key)).toEqual(["today", "yesterday", "twoDaysAgo", "earlier"]);

    const companyGroups = groupApplicationsByAppliedDate(allApplications, "company", NOW);
    expect(companyGroups.map((g) => g.key)).toEqual(["today", "yesterday", "twoDaysAgo", "earlier"]);
  });

  it("omits empty groups entirely", () => {
    const groups = groupApplicationsByAppliedDate([today1, earlier1], "newest", NOW);
    expect(groups.map((g) => g.key)).toEqual(["today", "earlier"]);
  });

  it("sorts newest first by appliedAt descending inside each group", () => {
    const groups = groupApplicationsByAppliedDate(allApplications, "newest", NOW);
    const todayGroup = groups.find((g) => g.key === "today");
    expect(todayGroup?.applications.map((a) => a.id)).toEqual(["today-2", "today-1"]);
  });

  it("sorts oldest first by appliedAt ascending inside each group", () => {
    const groups = groupApplicationsByAppliedDate(allApplications, "oldest", NOW);
    const todayGroup = groups.find((g) => g.key === "today");
    expect(todayGroup?.applications.map((a) => a.id)).toEqual(["today-1", "today-2"]);
  });

  it("sorts by lastActivityAt descending inside each group for activity sort", () => {
    const groups = groupApplicationsByAppliedDate(allApplications, "activity", NOW);
    const todayGroup = groups.find((g) => g.key === "today");
    expect(todayGroup?.applications.map((a) => a.id)).toEqual(["today-2", "today-1"]);
  });

  it("sorts alphabetically by company for company sort", () => {
    const groups = groupApplicationsByAppliedDate(allApplications, "company", NOW);
    const todayGroup = groups.find((g) => g.key === "today");
    expect(todayGroup?.applications.map((a) => a.company)).toEqual(["Alpha", "Zeta"]);
  });

  it("never mixes applications from different date groups", () => {
    const groups = groupApplicationsByAppliedDate(allApplications, "newest", NOW);
    for (const group of groups) {
      for (const application of group.applications) {
        expect(resolveDateGroupKey(new Date(application.appliedAt), NOW)).toBe(group.key);
      }
    }
  });

  it("returns an empty array when there are no applications", () => {
    expect(groupApplicationsByAppliedDate([], "newest", NOW)).toEqual([]);
  });
});
