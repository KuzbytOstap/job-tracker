import { describe, expect, it } from "vitest";
import { Status } from "@/app/generated/prisma/client";
import { effectiveStatus, type StatusSource } from "@/lib/status";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-14T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

describe("effectiveStatus", () => {
  it("keeps a fresh APPLIED application as APPLIED", () => {
    const application: StatusSource = {
      status: Status.APPLIED,
      lastActivityAt: daysAgo(1),
    };

    expect(effectiveStatus(application, NOW)).toBe(Status.APPLIED);
  });

  it("turns a 22-day-old APPLIED application into IGNORED", () => {
    const application: StatusSource = {
      status: Status.APPLIED,
      lastActivityAt: daysAgo(22),
    };

    expect(effectiveStatus(application, NOW)).toBe(Status.IGNORED);
  });

  it("keeps a 22-day-old OFFER application as OFFER", () => {
    const application: StatusSource = {
      status: Status.OFFER,
      lastActivityAt: daysAgo(22),
    };

    expect(effectiveStatus(application, NOW)).toBe(Status.OFFER);
  });

  it("keeps an exactly 21-day-old APPLIED application as APPLIED", () => {
    const application: StatusSource = {
      status: Status.APPLIED,
      lastActivityAt: daysAgo(21),
    };

    expect(effectiveStatus(application, NOW)).toBe(Status.APPLIED);
  });

  it("keeps a stored IGNORED application as IGNORED", () => {
    const application: StatusSource = {
      status: Status.IGNORED,
      lastActivityAt: daysAgo(1),
    };

    expect(effectiveStatus(application, NOW)).toBe(Status.IGNORED);
  });

  it("does not mutate its input", () => {
    const application: StatusSource = {
      status: Status.APPLIED,
      lastActivityAt: daysAgo(22),
    };
    const snapshot = { ...application };

    effectiveStatus(application, NOW);

    expect(application).toEqual(snapshot);
  });
});

describe("effectiveStatus with a per-user threshold", () => {
  it("uses a custom number of days", () => {
    const stale: StatusSource = { status: Status.APPLIED, lastActivityAt: daysAgo(8) };
    const fresh: StatusSource = { status: Status.APPLIED, lastActivityAt: daysAgo(6) };

    expect(effectiveStatus(stale, NOW, 7)).toBe(Status.IGNORED);
    expect(effectiveStatus(fresh, NOW, 7)).toBe(Status.APPLIED);
  });

  it("never auto-ignores when the threshold is null", () => {
    const veryOld: StatusSource = { status: Status.HR_REPLIED, lastActivityAt: daysAgo(400) };

    expect(effectiveStatus(veryOld, NOW, null)).toBe(Status.HR_REPLIED);
  });

  it("keeps terminal statuses regardless of the threshold", () => {
    const offer: StatusSource = { status: Status.OFFER, lastActivityAt: daysAgo(400) };

    expect(effectiveStatus(offer, NOW, 1)).toBe(Status.OFFER);
  });

  it("treats exactly the threshold as still active", () => {
    const boundary: StatusSource = { status: Status.APPLIED, lastActivityAt: daysAgo(7) };

    expect(effectiveStatus(boundary, NOW, 7)).toBe(Status.APPLIED);
  });
});
