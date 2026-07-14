import { describe, expect, it } from "vitest";
import {
  canEnterTestTaskFrom,
  hasReachedPipelineStage,
  isForwardPipelineMove,
  isPrimaryPipelineStatus,
  resolveMoveStatusPayload,
  resolveRestoreTargetStatus,
} from "@/lib/status-transitions";
import { Status } from "@/app/generated/prisma/enums";

describe("resolveMoveStatusPayload", () => {
  it("forces hasTestTask when moving to TEST_TASK", () => {
    expect(resolveMoveStatusPayload(Status.TEST_TASK)).toEqual({
      status: Status.TEST_TASK,
      hasTestTask: true,
    });
  });

  it("leaves hasTestTask untouched for any other status", () => {
    for (const status of Object.values(Status)) {
      if (status === Status.TEST_TASK) continue;
      expect(resolveMoveStatusPayload(status)).toEqual({ status });
    }
  });
});

describe("canEnterTestTaskFrom", () => {
  it("allows entering the test-task branch only from HR_CALL or TECH_INTERVIEW", () => {
    expect(canEnterTestTaskFrom(Status.HR_CALL)).toBe(true);
    expect(canEnterTestTaskFrom(Status.TECH_INTERVIEW)).toBe(true);
    expect(canEnterTestTaskFrom(Status.APPLIED)).toBe(false);
    expect(canEnterTestTaskFrom(Status.OFFER)).toBe(false);
  });
});

describe("isPrimaryPipelineStatus / isForwardPipelineMove", () => {
  it("recognizes the five linear pipeline statuses", () => {
    expect(isPrimaryPipelineStatus(Status.APPLIED)).toBe(true);
    expect(isPrimaryPipelineStatus(Status.OFFER)).toBe(true);
    expect(isPrimaryPipelineStatus(Status.TEST_TASK)).toBe(false);
    expect(isPrimaryPipelineStatus(Status.REJECTED)).toBe(false);
  });

  it("treats moving to a later pipeline stage as forward", () => {
    expect(isForwardPipelineMove(Status.APPLIED, Status.HR_CALL)).toBe(true);
    expect(isForwardPipelineMove(Status.HR_REPLIED, Status.OFFER)).toBe(true);
  });

  it("treats moving to an earlier pipeline stage as backward", () => {
    expect(isForwardPipelineMove(Status.TECH_INTERVIEW, Status.APPLIED)).toBe(false);
    expect(isForwardPipelineMove(Status.OFFER, Status.HR_CALL)).toBe(false);
  });
});

describe("hasReachedPipelineStage", () => {
  it("treats the current stage as reached", () => {
    expect(hasReachedPipelineStage(Status.HR_CALL, Status.HR_CALL, [])).toBe(true);
  });

  it("treats an earlier pipeline stage as reached once further along", () => {
    expect(hasReachedPipelineStage(Status.OFFER, Status.HR_REPLIED, [])).toBe(true);
  });

  it("treats a later pipeline stage as not reached", () => {
    expect(hasReachedPipelineStage(Status.HR_REPLIED, Status.OFFER, [])).toBe(false);
  });

  it("falls back to history when the current status is off the linear pipeline", () => {
    expect(hasReachedPipelineStage(Status.REJECTED, Status.HR_CALL, [Status.HR_CALL])).toBe(true);
    expect(hasReachedPipelineStage(Status.REJECTED, Status.OFFER, [Status.HR_CALL])).toBe(false);
  });
});

describe("resolveRestoreTargetStatus", () => {
  it("restores to the status the application held right before it became terminal", () => {
    const application = {
      status: Status.REJECTED,
      statusChanges: [
        { fromStatus: Status.TECH_INTERVIEW, toStatus: Status.REJECTED },
        { fromStatus: Status.HR_CALL, toStatus: Status.TECH_INTERVIEW },
      ],
    };
    expect(resolveRestoreTargetStatus(application)).toBe(Status.TECH_INTERVIEW);
  });

  it("falls back to APPLIED when there is no history landing on the current status", () => {
    const application = { status: Status.IGNORED, statusChanges: [] };
    expect(resolveRestoreTargetStatus(application)).toBe(Status.APPLIED);
  });

  it("uses the most recent transition when the same status was reached more than once", () => {
    const application = {
      status: Status.IGNORED,
      statusChanges: [
        { fromStatus: Status.OFFER, toStatus: Status.IGNORED },
        { fromStatus: Status.APPLIED, toStatus: Status.IGNORED },
      ],
    };
    expect(resolveRestoreTargetStatus(application)).toBe(Status.OFFER);
  });
});
