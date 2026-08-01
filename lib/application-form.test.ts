import { describe, expect, it } from "vitest";
import {
  applicationFormValuesFromApplication,
  applicationFormValuesToCreatePayload,
  applicationFormValuesToUpdatePayload,
  defaultApplicationFormValues,
  type ApplicationFormValues,
} from "@/lib/application-form";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO } from "@/lib/api-types";

function values(overrides: Partial<ApplicationFormValues> = {}): ApplicationFormValues {
  return {
    company: "  Acme  ",
    position: "  Engineer  ",
    platform: "DIRECT",
    link: "",
    salaryExpectation: "",
    notes: "",
    appliedAt: "2026-07-10",
    hasTestTask: false,
    ...overrides,
  };
}

describe("defaultApplicationFormValues", () => {
  it("defaults appliedAt to today and leaves optional fields blank", () => {
    const defaults = defaultApplicationFormValues();
    expect(defaults.company).toBe("");
    expect(defaults.hasTestTask).toBe(false);
    expect(defaults.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("applicationFormValuesToCreatePayload", () => {
  it("trims company and position", () => {
    const payload = applicationFormValuesToCreatePayload(values());
    expect(payload.company).toBe("Acme");
    expect(payload.position).toBe("Engineer");
  });

  it("omits empty link, salary expectation, and notes instead of sending empty strings", () => {
    const payload = applicationFormValuesToCreatePayload(values());
    expect(payload.link).toBeUndefined();
    expect(payload.salaryExpectation).toBeUndefined();
    expect(payload.notes).toBeUndefined();
  });

  it("keeps a provided link, salary expectation, and notes", () => {
    const payload = applicationFormValuesToCreatePayload(
      values({ link: "https://example.com/job", salaryExpectation: "$4000", notes: "Great fit" }),
    );
    expect(payload.link).toBe("https://example.com/job");
    expect(payload.salaryExpectation).toBe("$4000");
    expect(payload.notes).toBe("Great fit");
  });

  it("converts appliedAt to an ISO string", () => {
    const payload = applicationFormValuesToCreatePayload(values({ appliedAt: "2026-07-10" }));
    expect(payload.appliedAt).toBe(new Date("2026-07-10").toISOString());
  });

  it("carries hasTestTask through", () => {
    const payload = applicationFormValuesToCreatePayload(values({ hasTestTask: true }));
    expect(payload.hasTestTask).toBe(true);
  });
});

describe("applicationFormValuesToUpdatePayload", () => {
  it("does not include hasTestTask, since the edit form never controls it", () => {
    const payload = applicationFormValuesToUpdatePayload(values({ hasTestTask: true }));
    expect(payload).not.toHaveProperty("hasTestTask");
  });

  it("still includes the other editable fields", () => {
    const payload = applicationFormValuesToUpdatePayload(values());
    expect(payload.company).toBe("Acme");
    expect(payload.appliedAt).toBe(new Date("2026-07-10").toISOString());
  });
});

describe("applicationFormValuesFromApplication", () => {
  it("maps null optional fields to empty strings for controlled inputs", () => {
    const application: ApplicationDTO = {
      id: "a1",
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
      sourceUrls: [],
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
    };

    const result = applicationFormValuesFromApplication(application);
    expect(result.link).toBe("");
    expect(result.salaryExpectation).toBe("");
    expect(result.notes).toBe("");
    expect(result.appliedAt).toBe("2026-07-10");
  });
});
