import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "@/lib/relative-date";

const NOW = new Date(2026, 6, 14, 15, 0, 0);

describe("formatRelativeDate", () => {
  it("formats the same calendar day as today", () => {
    expect(formatRelativeDate(new Date(2026, 6, 14, 8, 0, 0), NOW)).toBe("today");
  });

  it("formats the previous calendar day as yesterday", () => {
    expect(formatRelativeDate(new Date(2026, 6, 13, 23, 59, 59), NOW)).toBe("yesterday");
  });

  it("formats exactly 2 days ago", () => {
    expect(formatRelativeDate(new Date(2026, 6, 12, 9, 0, 0), NOW)).toBe("2 days ago");
  });

  it("formats 5 days ago", () => {
    expect(formatRelativeDate(new Date(2026, 6, 9, 9, 0, 0), NOW)).toBe("5 days ago");
  });

  it("formats exactly 1 week ago", () => {
    expect(formatRelativeDate(new Date(2026, 6, 7, 9, 0, 0), NOW)).toBe("1 week ago");
  });

  it("formats multiple weeks ago", () => {
    expect(formatRelativeDate(new Date(2026, 5, 30, 9, 0, 0), NOW)).toBe("2 weeks ago");
    expect(formatRelativeDate(new Date(2026, 5, 23, 9, 0, 0), NOW)).toBe("3 weeks ago");
  });

  it("formats a month-like range in months", () => {
    expect(formatRelativeDate(new Date(2026, 4, 15, 9, 0, 0), NOW)).toBe("2 months ago");
  });

  it("formats a future date gracefully as today", () => {
    expect(formatRelativeDate(new Date(2026, 6, 17, 9, 0, 0), NOW)).toBe("today");
  });

  it("handles small clock skew where the date is slightly ahead of now", () => {
    expect(formatRelativeDate(new Date(2026, 6, 14, 15, 0, 5), NOW)).toBe("today");
  });

  it("handles an invalid date safely", () => {
    expect(formatRelativeDate("not-a-date", NOW)).toBe("unknown date");
    expect(formatRelativeDate(new Date(NaN), NOW)).toBe("unknown date");
  });

  it("never returns an awkward 0 days ago", () => {
    expect(formatRelativeDate(new Date(2026, 6, 14, 0, 0, 0), NOW)).not.toContain("0 days ago");
  });

  it("uses local calendar-day boundaries at a midnight boundary", () => {
    const justAfterMidnight = new Date(2026, 6, 14, 0, 0, 1);

    const oneSecondBeforeMidnight = new Date(2026, 6, 13, 23, 59, 59);
    expect(formatRelativeDate(oneSecondBeforeMidnight, justAfterMidnight)).toBe("yesterday");

    const exactlyMidnightToday = new Date(2026, 6, 14, 0, 0, 0);
    expect(formatRelativeDate(exactlyMidnightToday, justAfterMidnight)).toBe("today");
  });
});
