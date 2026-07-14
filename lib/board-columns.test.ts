import { describe, expect, it } from "vitest";
import {
  BOARD_COLUMNS,
  distributeApplicationsIntoColumns,
  getBoardColumnBySlug,
  getSlugForStatus,
} from "@/lib/board-columns";
import { groupApplicationsByAppliedDate } from "@/lib/date-grouping";
import { Status } from "@/app/generated/prisma/enums";

type TestApplication = {
  id: string;
  company: string;
  appliedAt: string;
  lastActivityAt: string;
  effectiveStatus: Status;
};

function app(id: string, effectiveStatus: Status, overrides: Partial<TestApplication> = {}): TestApplication {
  return {
    id,
    company: overrides.company ?? `Company ${id}`,
    appliedAt: overrides.appliedAt ?? "2026-07-10T12:00:00.000Z",
    lastActivityAt: overrides.lastActivityAt ?? "2026-07-10T12:00:00.000Z",
    effectiveStatus,
  };
}

describe("board column order and slugs", () => {
  it("keeps a stable, prescribed column order", () => {
    expect(BOARD_COLUMNS.map((c) => c.status)).toEqual([
      Status.APPLIED,
      Status.HR_REPLIED,
      Status.HR_CALL,
      Status.TECH_INTERVIEW,
      Status.TEST_TASK,
      Status.OFFER,
      Status.REJECTED,
      Status.IGNORED,
    ]);
  });

  it("gives every status a unique URL slug", () => {
    const slugs = BOARD_COLUMNS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual([
      "applied",
      "hr-replied",
      "hr-call",
      "tech-interview",
      "test-task",
      "offer",
      "rejected",
      "ignored",
    ]);
  });

  it("maps every slug back to the correct status", () => {
    for (const column of BOARD_COLUMNS) {
      expect(getBoardColumnBySlug(column.slug)?.status).toBe(column.status);
      expect(getSlugForStatus(column.status)).toBe(column.slug);
    }
  });

  it("rejects an invalid slug", () => {
    expect(getBoardColumnBySlug("not-a-real-status")).toBeUndefined();
    expect(getBoardColumnBySlug("")).toBeUndefined();
  });
});

describe("distributeApplicationsIntoColumns", () => {
  it("maps every effective status to exactly one column", () => {
    const applications = BOARD_COLUMNS.map((column, index) =>
      app(`app-${index}`, column.status),
    );

    const columns = distributeApplicationsIntoColumns(applications);

    for (const column of columns) {
      expect(column.applications).toHaveLength(1);
      expect(column.applications[0].effectiveStatus).toBe(column.status);
    }

    const totalDistributed = columns.reduce((sum, c) => sum + c.applications.length, 0);
    expect(totalDistributed).toBe(applications.length);
  });

  it("places an auto-ignored application only in IGNORED, not its stored status column", () => {
    const autoIgnored = app("auto-ignored", Status.IGNORED);
    const columns = distributeApplicationsIntoColumns([autoIgnored]);

    const ignoredColumn = columns.find((c) => c.status === Status.IGNORED);
    const appliedColumn = columns.find((c) => c.status === Status.APPLIED);

    expect(ignoredColumn?.applications).toHaveLength(1);
    expect(ignoredColumn?.applications[0].id).toBe("auto-ignored");
    expect(appliedColumn?.applications).toHaveLength(0);
  });

  it("places a stored IGNORED application in IGNORED", () => {
    const storedIgnored = app("stored-ignored", Status.IGNORED);
    const columns = distributeApplicationsIntoColumns([storedIgnored]);
    const ignoredColumn = columns.find((c) => c.status === Status.IGNORED);
    expect(ignoredColumn?.applications.map((a) => a.id)).toEqual(["stored-ignored"]);
  });

  it("places an APPLIED application only in the APPLIED column", () => {
    const applied = app("applied-1", Status.APPLIED);
    const columns = distributeApplicationsIntoColumns([applied]);

    for (const column of columns) {
      if (column.status === Status.APPLIED) {
        expect(column.applications.map((a) => a.id)).toEqual(["applied-1"]);
      } else {
        expect(column.applications).toHaveLength(0);
      }
    }
  });

  it("keeps empty columns present on the board", () => {
    const columns = distributeApplicationsIntoColumns([]);
    expect(columns).toHaveLength(BOARD_COLUMNS.length);
    for (const column of columns) {
      expect(column.applications).toEqual([]);
    }
  });

  it("distributes an already-searched subset only into matching columns", () => {
    const searchResults = [app("react-1", Status.APPLIED), app("react-2", Status.OFFER)];
    const columns = distributeApplicationsIntoColumns(searchResults);

    const nonEmpty = columns.filter((c) => c.applications.length > 0);
    expect(nonEmpty.map((c) => c.status).sort()).toEqual([Status.APPLIED, Status.OFFER].sort());

    const empty = columns.filter((c) => c.applications.length === 0);
    expect(empty).toHaveLength(BOARD_COLUMNS.length - 2);
  });
});

describe("board column composition with date grouping and sorting", () => {
  const columnApplications = [
    app("a1", Status.OFFER, { company: "Zeta", appliedAt: "2026-07-14T08:00:00.000Z" }),
    app("a2", Status.OFFER, { company: "Alpha", appliedAt: "2026-07-14T13:00:00.000Z" }),
    app("a3", Status.OFFER, { company: "Beta", appliedAt: "2026-06-01T09:00:00.000Z" }),
  ];

  it("still groups a column's applications by appliedAt date", () => {
    const columns = distributeApplicationsIntoColumns(columnApplications);
    const offerColumn = columns.find((c) => c.status === Status.OFFER);
    const groups = groupApplicationsByAppliedDate(offerColumn!.applications, "newest", new Date("2026-07-14T18:00:00.000Z"));

    expect(groups.map((g) => g.key)).toEqual(["today", "earlier"]);
    expect(groups.find((g) => g.key === "today")?.applications).toHaveLength(2);
  });

  it("sorts independently within each column", () => {
    const otherColumnApplications = [
      app("b1", Status.REJECTED, { company: "Wolf", appliedAt: "2026-07-14T08:00:00.000Z" }),
      app("b2", Status.REJECTED, { company: "Ant", appliedAt: "2026-07-14T09:00:00.000Z" }),
    ];

    const columns = distributeApplicationsIntoColumns([
      ...columnApplications,
      ...otherColumnApplications,
    ]);

    const now = new Date("2026-07-14T18:00:00.000Z");
    const offerGroups = groupApplicationsByAppliedDate(
      columns.find((c) => c.status === Status.OFFER)!.applications,
      "company",
      now,
    );
    const rejectedGroups = groupApplicationsByAppliedDate(
      columns.find((c) => c.status === Status.REJECTED)!.applications,
      "company",
      now,
    );

    expect(offerGroups.find((g) => g.key === "today")?.applications.map((a) => a.company)).toEqual([
      "Alpha",
      "Zeta",
    ]);
    expect(rejectedGroups.find((g) => g.key === "today")?.applications.map((a) => a.company)).toEqual([
      "Ant",
      "Wolf",
    ]);
  });
});
