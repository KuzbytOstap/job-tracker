import { describe, expect, it } from "vitest";
import {
  applicationMatchesListParams,
  buildOptimisticListItem,
  removeApplicationFromList,
  sortApplicationDTOs,
  upsertApplicationInList,
} from "@/lib/cache-updates";
import { BOARD_COLUMNS, distributeApplicationsIntoColumns, getStatusPageHref } from "@/lib/board-columns";
import { groupApplicationsByAppliedDate } from "@/lib/date-grouping";
import { resolveMoveStatusPayload } from "@/lib/status-transitions";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO, ApplicationsListResponse } from "@/lib/api-types";
import type { ApplicationsListParams } from "@/lib/query-keys";

function makeApp(overrides: Partial<ApplicationDTO> = {}): ApplicationDTO {
  return {
    id: "app-1",
    company: "Acme",
    position: "Engineer",
    platform: "DIRECT",
    link: null,
    status: Status.APPLIED,
    hasTestTask: false,
    testTaskDone: false,
    salaryExpectation: null,
    notes: null,
    jobPostingText: null,
    coverLetterText: null,
    hrCallTranscript: null,
    appliedAt: "2026-07-10T12:00:00.000Z",
    lastActivityAt: "2026-07-10T12:00:00.000Z",
    createdAt: "2026-07-10T12:00:00.000Z",
    updatedAt: "2026-07-10T12:00:00.000Z",
    effectiveStatus: Status.APPLIED,
    isAutoIgnored: false,
    statusChanges: [],
    hrInterviewQuestions: null,
    hrQuestionsGeneratedAt: null,
    ...overrides,
  };
}

function listOf(...applications: ApplicationDTO[]): ApplicationsListResponse {
  return { applications, total: applications.length };
}

function paramsFor(status: ApplicationsListParams["status"], q = ""): ApplicationsListParams {
  return { status, sort: "newest", q };
}

describe("upsertApplicationInList — creating an application", () => {
  it("places a newly created application into the APPLIED list", () => {
    const created = makeApp({ id: "new-1", status: Status.APPLIED, effectiveStatus: Status.APPLIED });
    const result = upsertApplicationInList(listOf(), created, paramsFor(Status.APPLIED));
    expect(result.applications.map((a) => a.id)).toEqual(["new-1"]);
  });

  it("does not place a newly created APPLIED application into an unrelated focused list", () => {
    const created = makeApp({ id: "new-1", status: Status.APPLIED, effectiveStatus: Status.APPLIED });
    const result = upsertApplicationInList(listOf(), created, paramsFor(Status.HR_REPLIED));
    expect(result.applications).toHaveLength(0);
  });

  it("places a newly created application into the ALL list", () => {
    const created = makeApp({ id: "new-1" });
    const result = upsertApplicationInList(listOf(), created, paramsFor("ALL"));
    expect(result.applications.map((a) => a.id)).toEqual(["new-1"]);
  });
});

describe("upsertApplicationInList — status moves", () => {
  it("moving APPLIED to HR_REPLIED removes it from the APPLIED list and inserts it into the HR_REPLIED list", () => {
    const original = makeApp({ id: "a1", status: Status.APPLIED, effectiveStatus: Status.APPLIED });
    const moved = { ...original, status: Status.HR_REPLIED, effectiveStatus: Status.HR_REPLIED };

    const appliedList = upsertApplicationInList(listOf(original), moved, paramsFor(Status.APPLIED));
    expect(appliedList.applications).toHaveLength(0);

    const hrRepliedList = upsertApplicationInList(listOf(), moved, paramsFor(Status.HR_REPLIED));
    expect(hrRepliedList.applications.map((a) => a.id)).toEqual(["a1"]);
  });

  it("moving to REJECTED places it only in the REJECTED list, not its previous status list", () => {
    const original = makeApp({ id: "a1", status: Status.TECH_INTERVIEW, effectiveStatus: Status.TECH_INTERVIEW });
    const rejected = { ...original, status: Status.REJECTED, effectiveStatus: Status.REJECTED };

    const previousList = upsertApplicationInList(listOf(original), rejected, paramsFor(Status.TECH_INTERVIEW));
    expect(previousList.applications).toHaveLength(0);

    const rejectedList = upsertApplicationInList(listOf(), rejected, paramsFor(Status.REJECTED));
    expect(rejectedList.applications.map((a) => a.id)).toEqual(["a1"]);
  });

  it("moving to stored IGNORED places it only in the IGNORED list", () => {
    const original = makeApp({ id: "a1", status: Status.APPLIED, effectiveStatus: Status.APPLIED });
    const ignored = { ...original, status: Status.IGNORED, effectiveStatus: Status.IGNORED };

    const appliedList = upsertApplicationInList(listOf(original), ignored, paramsFor(Status.APPLIED));
    expect(appliedList.applications).toHaveLength(0);

    const ignoredList = upsertApplicationInList(listOf(), ignored, paramsFor(Status.IGNORED));
    expect(ignoredList.applications.map((a) => a.id)).toEqual(["a1"]);
  });

  it("moving to TEST_TASK ensures hasTestTask is included in the mutation payload", () => {
    expect(resolveMoveStatusPayload(Status.TEST_TASK)).toEqual({
      status: Status.TEST_TASK,
      hasTestTask: true,
    });
  });

  it("moving to a non-TEST_TASK status does not force hasTestTask", () => {
    expect(resolveMoveStatusPayload(Status.OFFER)).toEqual({ status: Status.OFFER });
  });

  it("changing testTaskDone alone does not move the application between columns", () => {
    const original = makeApp({
      id: "a1",
      status: Status.TECH_INTERVIEW,
      effectiveStatus: Status.TECH_INTERVIEW,
      hasTestTask: true,
      testTaskDone: false,
    });
    const updated = { ...original, testTaskDone: true };

    const list = upsertApplicationInList(listOf(original), updated, paramsFor(Status.TECH_INTERVIEW));
    expect(list.applications.map((a) => a.id)).toEqual(["a1"]);
    expect(list.applications[0].testTaskDone).toBe(true);
  });
});

describe("reactivating an auto-ignored application", () => {
  it("moves it from the IGNORED list to its stored-status list", () => {
    const autoIgnored = makeApp({
      id: "a1",
      status: Status.HR_CALL,
      effectiveStatus: Status.IGNORED,
      isAutoIgnored: true,
    });
    const reactivated = {
      ...autoIgnored,
      effectiveStatus: Status.HR_CALL,
      isAutoIgnored: false,
      lastActivityAt: "2026-07-14T12:00:00.000Z",
    };

    const ignoredList = upsertApplicationInList(listOf(autoIgnored), reactivated, paramsFor(Status.IGNORED));
    expect(ignoredList.applications).toHaveLength(0);

    const hrCallList = upsertApplicationInList(listOf(), reactivated, paramsFor(Status.HR_CALL));
    expect(hrCallList.applications.map((a) => a.id)).toEqual(["a1"]);
    expect(hrCallList.applications[0].status).toBe(Status.HR_CALL);
  });
});

describe("removeApplicationFromList — deletion", () => {
  it("removes the application from every cached list it appeared in", () => {
    const a1 = makeApp({ id: "a1" });
    const a2 = makeApp({ id: "a2" });

    const result = removeApplicationFromList(listOf(a1, a2), "a1");
    expect(result.applications.map((a) => a.id)).toEqual(["a2"]);
    expect(result.total).toBe(1);
  });

  it("removing an id that is not present leaves the list unchanged", () => {
    const a1 = makeApp({ id: "a1" });
    const original = listOf(a1);
    const result = removeApplicationFromList(original, "missing");
    expect(result).toBe(original);
  });

  it("deleting removes the application from board distribution entirely", () => {
    const a1 = makeApp({ id: "a1", status: Status.OFFER, effectiveStatus: Status.OFFER });
    const afterDelete = removeApplicationFromList(listOf(a1), "a1");
    const columns = distributeApplicationsIntoColumns(afterDelete.applications);
    for (const column of columns) {
      expect(column.applications).toHaveLength(0);
    }
  });
});

describe("focused status page removal after a status change", () => {
  it("removes an application from a focused list once its effective status no longer matches", () => {
    const original = makeApp({ id: "a1", status: Status.HR_CALL, effectiveStatus: Status.HR_CALL });
    const moved = { ...original, status: Status.TEST_TASK, effectiveStatus: Status.TEST_TASK };

    const focusedHrCall = upsertApplicationInList(listOf(original), moved, paramsFor(Status.HR_CALL));
    expect(focusedHrCall.applications).toHaveLength(0);
  });
});

describe("optimistic status movement rollback", () => {
  it("restores the original list contents when a status mutation fails", () => {
    const original = makeApp({ id: "a1", status: Status.APPLIED, effectiveStatus: Status.APPLIED });
    const originalList = listOf(original);

    const optimisticallyMoved = { ...original, status: Status.HR_REPLIED, effectiveStatus: Status.HR_REPLIED };
    const optimisticList = upsertApplicationInList(originalList, optimisticallyMoved, paramsFor(Status.APPLIED));
    expect(optimisticList.applications).toHaveLength(0);

    const rolledBack = upsertApplicationInList(optimisticList, original, paramsFor(Status.APPLIED));
    expect(rolledBack.applications).toEqual(originalList.applications);
  });
});

describe("appliedAt edits and date grouping", () => {
  it("moves the card into the correct date group inside its column after an appliedAt edit", () => {
    const now = new Date("2026-07-14T18:00:00.000Z");
    const original = makeApp({
      id: "a1",
      status: Status.OFFER,
      effectiveStatus: Status.OFFER,
      appliedAt: "2026-06-01T09:00:00.000Z",
    });
    const edited = { ...original, appliedAt: "2026-07-14T09:00:00.000Z" };

    const list = upsertApplicationInList(listOf(original), edited, paramsFor(Status.OFFER));
    const groups = groupApplicationsByAppliedDate(list.applications, "newest", now);

    expect(groups.map((g) => g.key)).toEqual(["today"]);
    expect(groups[0].applications.map((a) => a.id)).toEqual(["a1"]);
  });
});

describe("no application appears in multiple board columns across a sequence of moves", () => {
  it("keeps exactly one column populated at every step of a status transition sequence", () => {
    let app = makeApp({ id: "a1", status: Status.APPLIED, effectiveStatus: Status.APPLIED });
    const sequence: Status[] = [Status.HR_REPLIED, Status.HR_CALL, Status.TEST_TASK, Status.TECH_INTERVIEW, Status.OFFER];

    for (const nextStatus of sequence) {
      app = { ...app, status: nextStatus, effectiveStatus: nextStatus };
      const columns = distributeApplicationsIntoColumns([app]);
      const populated = columns.filter((c) => c.applications.length > 0);
      expect(populated).toHaveLength(1);
      expect(populated[0].status).toBe(nextStatus);
    }
  });
});

describe("destination status URLs use shared slug configuration", () => {
  it("builds every focused-status href from BOARD_COLUMNS, never a hardcoded duplicate", () => {
    for (const column of BOARD_COLUMNS) {
      expect(getStatusPageHref(column.status)).toBe(`/status/${column.slug}`);
    }
  });
});

describe("applicationMatchesListParams", () => {
  it("matches ALL regardless of status", () => {
    const app = makeApp({ effectiveStatus: Status.OFFER });
    expect(applicationMatchesListParams(app, paramsFor("ALL"))).toBe(true);
  });

  it("is case-insensitive and matches company or position substrings", () => {
    const app = makeApp({ company: "Globex Corp", position: "Senior Engineer" });
    expect(applicationMatchesListParams(app, paramsFor("ALL", "globex"))).toBe(true);
    expect(applicationMatchesListParams(app, paramsFor("ALL", "SENIOR"))).toBe(true);
    expect(applicationMatchesListParams(app, paramsFor("ALL", "nomatch"))).toBe(false);
  });
});

describe("sortApplicationDTOs", () => {
  it("sorts by company alphabetically for the company sort", () => {
    const apps = [makeApp({ id: "z", company: "Zeta" }), makeApp({ id: "a", company: "Alpha" })];
    expect(sortApplicationDTOs(apps, "company").map((a) => a.id)).toEqual(["a", "z"]);
  });
});

describe("buildOptimisticListItem", () => {
  it("creates an APPLIED list item with sane defaults from a minimal create payload", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const optimistic = buildOptimisticListItem(
      { company: "Acme", position: "Engineer", platform: "DIRECT" },
      "optimistic-1",
      now,
    );

    expect(optimistic.status).toBe(Status.APPLIED);
    expect(optimistic.effectiveStatus).toBe(Status.APPLIED);
    expect(optimistic.isAutoIgnored).toBe(false);
    expect(optimistic.link).toBeNull();
    expect(optimistic.appliedAt).toBe(now.toISOString());
    expect(optimistic.updatedAt).toBe(now.toISOString());
  });

  it("respects an explicitly provided appliedAt", () => {
    const now = new Date("2026-07-14T12:00:00.000Z");
    const optimistic = buildOptimisticListItem(
      { company: "Acme", position: "Engineer", platform: "DIRECT", appliedAt: "2026-07-01T00:00:00.000Z" },
      "optimistic-1",
      now,
    );
    expect(optimistic.appliedAt).toBe("2026-07-01T00:00:00.000Z");
  });
});
