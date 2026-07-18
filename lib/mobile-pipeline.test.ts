import { describe, expect, it } from "vitest";
import {
  getMobileSingleStatusApplications,
  getMobileStatusCounts,
  getMobileStatusGroups,
} from "@/lib/mobile-pipeline";
import { BOARD_COLUMNS } from "@/lib/board-columns";
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

describe("getMobileStatusCounts", () => {
  it("returns a count for every status, including zero for empty ones", () => {
    const counts = getMobileStatusCounts([app("a1", Status.APPLIED)]);

    expect(counts).toHaveLength(BOARD_COLUMNS.length);
    expect(counts.find((c) => c.column.status === Status.APPLIED)?.count).toBe(1);
    expect(counts.find((c) => c.column.status === Status.OFFER)?.count).toBe(0);
  });
});

describe("getMobileStatusGroups", () => {
  it("groups applications by status in existing pipeline order", () => {
    const applications = [
      app("offer-1", Status.OFFER),
      app("applied-1", Status.APPLIED),
      app("hr-1", Status.HR_REPLIED),
    ];

    const groups = getMobileStatusGroups(applications, "newest");

    expect(groups.map((g) => g.column.status)).toEqual([
      Status.APPLIED,
      Status.HR_REPLIED,
      Status.OFFER,
    ]);
  });

  it("omits empty status groups", () => {
    const groups = getMobileStatusGroups([app("applied-1", Status.APPLIED)], "newest");

    expect(groups).toHaveLength(1);
    expect(groups[0].column.status).toBe(Status.APPLIED);
  });

  it("places every application in exactly one group", () => {
    const applications = BOARD_COLUMNS.map((column, index) => app(`app-${index}`, column.status));

    const groups = getMobileStatusGroups(applications, "newest");
    const totalGrouped = groups.reduce((sum, g) => sum + g.applications.length, 0);

    expect(totalGrouped).toBe(applications.length);
  });

  it("orders applications within a group using the current sort, not a new order", () => {
    const applications = [
      app("z", Status.APPLIED, { company: "Zeta", appliedAt: "2026-07-14T13:00:00.000Z" }),
      app("a", Status.APPLIED, { company: "Alpha", appliedAt: "2026-07-14T08:00:00.000Z" }),
    ];

    const groups = getMobileStatusGroups(applications, "company");

    expect(groups[0].applications.map((a) => a.company)).toEqual(["Alpha", "Zeta"]);
  });
});

describe("getMobileSingleStatusApplications", () => {
  it("returns only applications matching the requested status", () => {
    const applications = [
      app("applied-1", Status.APPLIED),
      app("offer-1", Status.OFFER),
      app("applied-2", Status.APPLIED),
    ];

    const result = getMobileSingleStatusApplications(applications, Status.APPLIED, "newest");

    expect(result.map((a) => a.id).sort()).toEqual(["applied-1", "applied-2"]);
  });

  it("returns an empty array when no applications match", () => {
    const result = getMobileSingleStatusApplications([app("applied-1", Status.APPLIED)], Status.OFFER, "newest");
    expect(result).toEqual([]);
  });
});
