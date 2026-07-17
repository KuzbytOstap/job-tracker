import { describe, expect, it } from "vitest";
import { decideDropTransition } from "@/lib/drag-drop-transitions";
import { isForwardPipelineMove } from "@/lib/status-transitions";
import { Status } from "@/app/generated/prisma/enums";

function app(status: Status, effectiveStatus: Status = status) {
  return { status, effectiveStatus };
}

describe("decideDropTransition", () => {
  it("is a no-op when dropped on the column it already occupies", () => {
    expect(decideDropTransition(app(Status.HR_CALL), Status.HR_CALL)).toBe("noop");
  });

  it("is a no-op for an auto-ignored card dropped back on IGNORED, regardless of stored status", () => {
    const autoIgnored = app(Status.APPLIED, Status.IGNORED);
    expect(decideDropTransition(autoIgnored, Status.IGNORED)).toBe("noop");
  });

  it("treats a forward pipeline move as immediate", () => {
    expect(decideDropTransition(app(Status.APPLIED), Status.HR_REPLIED)).toBe("immediate");
  });

  it("requires confirmation for a backward pipeline move", () => {
    expect(decideDropTransition(app(Status.TECH_INTERVIEW), Status.HR_CALL)).toBe("confirm");
  });

  it("requires confirmation when moving to REJECTED, even from a forward position", () => {
    expect(decideDropTransition(app(Status.APPLIED), Status.REJECTED)).toBe("confirm");
  });

  it("requires confirmation when moving to IGNORED explicitly", () => {
    expect(decideDropTransition(app(Status.HR_CALL), Status.IGNORED)).toBe("confirm");
  });

  it("treats entering TEST_TASK as immediate from its source statuses", () => {
    expect(decideDropTransition(app(Status.HR_CALL), Status.TEST_TASK)).toBe("immediate");
    expect(decideDropTransition(app(Status.TECH_INTERVIEW), Status.TEST_TASK)).toBe("immediate");
  });

  it("treats leaving TEST_TASK as immediate, matching the existing test-task branch behavior", () => {
    expect(decideDropTransition(app(Status.TEST_TASK), Status.TECH_INTERVIEW)).toBe("immediate");
    expect(decideDropTransition(app(Status.TEST_TASK), Status.OFFER)).toBe("immediate");
  });

  it("uses the stored status for direction on an auto-ignored card, creating a normal explicit transition", () => {
    const autoIgnored = app(Status.APPLIED, Status.IGNORED);
    expect(decideDropTransition(autoIgnored, Status.HR_CALL)).toBe("immediate");
  });

  it("still requires confirmation moving an auto-ignored card to REJECTED", () => {
    const autoIgnored = app(Status.APPLIED, Status.IGNORED);
    expect(decideDropTransition(autoIgnored, Status.REJECTED)).toBe("confirm");
  });

  it("agrees with isForwardPipelineMove for every non-terminal-target status pair", () => {
    const nonTerminalTargets = Object.values(Status).filter(
      (status) => status !== Status.REJECTED && status !== Status.IGNORED,
    );
    for (const from of Object.values(Status)) {
      for (const to of nonTerminalTargets) {
        if (to === from) continue;
        const decision = decideDropTransition(app(from), to);
        const expected = isForwardPipelineMove(from, to) ? "immediate" : "confirm";
        expect(decision).toBe(expected);
      }
    }
  });
});
