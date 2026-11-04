import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCvHintSnoozedAt: vi.fn(),
  setCvHintSnoozedAt: vi.fn(),
  getPrimaryCvText: vi.fn(),
  listContextItemScores: vi.fn(),
  listSubstantialContextItems: vi.fn(),
  runProfileOperation: vi.fn(),
}));

vi.mock("@/lib/profile/profile-service", () => ({
  getCvHintSnoozedAt: (...args: unknown[]) => mocks.getCvHintSnoozedAt(...args),
  setCvHintSnoozedAt: (...args: unknown[]) => mocks.setCvHintSnoozedAt(...args),
}));

vi.mock("@/lib/profile/cv-service", () => ({
  getPrimaryCvText: (...args: unknown[]) => mocks.getPrimaryCvText(...args),
}));

vi.mock("@/lib/profile/context-items-service", () => ({
  listContextItemScores: (...args: unknown[]) => mocks.listContextItemScores(...args),
  listSubstantialContextItems: (...args: unknown[]) => mocks.listSubstantialContextItems(...args),
}));

vi.mock("@/lib/profile/run-profile-ai", () => ({
  runProfileOperation: (...args: unknown[]) => mocks.runProfileOperation(...args),
}));

import {
  evaluateCvUpdateHint,
  getCvUpdateHint,
  snoozeCvUpdateHint,
  suggestCvUpdates,
} from "@/lib/profile/cv-update-hint";

const NOW = new Date("2026-11-03T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function item(weight: string | null, impact: number | null, createdAt: Date = daysAgo(10)) {
  return { weight, impact, createdAt };
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

describe("evaluateCvUpdateHint", () => {
  it("is visible when the SUBSTANTIAL impact adds up to 6", () => {
    const hint = evaluateCvUpdateHint({
      items: [item("SUBSTANTIAL", 3), item("SUBSTANTIAL", 3)],
      snoozedAt: null,
      now: NOW,
    });

    expect(hint).toEqual({ visible: true, substantialCount: 2, snoozed: false });
  });

  it("stays hidden when the impact adds up to 5 and no single item is 5", () => {
    const hint = evaluateCvUpdateHint({
      items: [item("SUBSTANTIAL", 3), item("SUBSTANTIAL", 2)],
      snoozedAt: null,
      now: NOW,
    });

    expect(hint.visible).toBe(false);
  });

  it("is visible for a single item with impact 5", () => {
    const hint = evaluateCvUpdateHint({ items: [item("SUBSTANTIAL", 5)], snoozedAt: null, now: NOW });

    expect(hint.visible).toBe(true);
  });

  it("is never triggered by MINOR or COVERED items however many there are", () => {
    const items = [
      ...Array.from({ length: 30 }, () => item("MINOR", null)),
      ...Array.from({ length: 30 }, () => item("COVERED", null)),
    ];

    expect(evaluateCvUpdateHint({ items, snoozedAt: null, now: NOW })).toEqual({
      visible: false,
      substantialCount: 0,
      snoozed: false,
    });
  });

  it("ignores items that have not been scored yet", () => {
    const hint = evaluateCvUpdateHint({
      items: [item(null, null), item(null, null), item("SUBSTANTIAL", 2)],
      snoozedAt: null,
      now: NOW,
    });

    expect(hint).toEqual({ visible: false, substantialCount: 1, snoozed: false });
  });

  it("stays hidden for 7 days after the user snoozed it", () => {
    const hint = evaluateCvUpdateHint({
      items: [item("SUBSTANTIAL", 5, daysAgo(10))],
      snoozedAt: daysAgo(2),
      now: NOW,
    });

    expect(hint).toEqual({ visible: false, substantialCount: 1, snoozed: true });
  });

  it("comes back when a newer SUBSTANTIAL item was created after the snooze", () => {
    const hint = evaluateCvUpdateHint({
      items: [item("SUBSTANTIAL", 4, daysAgo(10)), item("SUBSTANTIAL", 4, daysAgo(1))],
      snoozedAt: daysAgo(2),
      now: NOW,
    });

    expect(hint).toEqual({ visible: true, substantialCount: 2, snoozed: false });
  });

  it("is not brought back by a newer MINOR item", () => {
    const hint = evaluateCvUpdateHint({
      items: [item("SUBSTANTIAL", 5, daysAgo(10)), item("MINOR", null, daysAgo(1))],
      snoozedAt: daysAgo(2),
      now: NOW,
    });

    expect(hint.visible).toBe(false);
    expect(hint.snoozed).toBe(true);
  });

  it("comes back once the 7 days have passed, exactly at the boundary", () => {
    const items = [item("SUBSTANTIAL", 5, daysAgo(30))];

    expect(evaluateCvUpdateHint({ items, snoozedAt: new Date(NOW.getTime() - 7 * DAY_MS + 1), now: NOW }).visible).toBe(
      false,
    );
    expect(evaluateCvUpdateHint({ items, snoozedAt: daysAgo(7), now: NOW })).toEqual({
      visible: true,
      substantialCount: 1,
      snoozed: false,
    });
  });
});

describe("getCvUpdateHint and snoozeCvUpdateHint", () => {
  it("evaluates the user's stored items against the stored snooze time", async () => {
    mocks.listContextItemScores.mockResolvedValue([item("SUBSTANTIAL", 5)]);
    mocks.getCvHintSnoozedAt.mockResolvedValue(null);

    await expect(getCvUpdateHint("user_1", NOW)).resolves.toEqual({
      visible: true,
      substantialCount: 1,
      snoozed: false,
    });
    expect(mocks.listContextItemScores).toHaveBeenCalledWith("user_1");
    expect(mocks.getCvHintSnoozedAt).toHaveBeenCalledWith("user_1");
  });

  it("stores the snooze time and returns the hint as hidden", async () => {
    mocks.listContextItemScores.mockResolvedValue([item("SUBSTANTIAL", 5)]);
    mocks.getCvHintSnoozedAt.mockResolvedValue(NOW);

    const hint = await snoozeCvUpdateHint("user_1", NOW);

    expect(mocks.setCvHintSnoozedAt).toHaveBeenCalledWith("user_1", NOW);
    expect(hint).toEqual({ visible: false, substantialCount: 1, snoozed: true });
  });
});

describe("suggestCvUpdates", () => {
  const SUBSTANTIAL_ITEMS = [
    { id: "i1", text: "Shipped passkeys" },
    { id: "i2", text: "Cut load time by 40%" },
  ];

  it("returns an empty list without reading the CV or calling AI when nothing is SUBSTANTIAL", async () => {
    mocks.listSubstantialContextItems.mockResolvedValue([]);

    await expect(suggestCvUpdates("user_1")).resolves.toEqual({ status: "ok", suggestions: [] });
    expect(mocks.getPrimaryCvText).not.toHaveBeenCalled();
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
  });

  it("reports NO_CV_TEXT when there is no CV text to compare against", async () => {
    mocks.listSubstantialContextItems.mockResolvedValue(SUBSTANTIAL_ITEMS);
    mocks.getPrimaryCvText.mockResolvedValue(null);

    await expect(suggestCvUpdates("user_1")).resolves.toEqual({ status: "skipped", reason: "NO_CV_TEXT" });
    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
  });

  it("sends only the SUBSTANTIAL items with their ids and the CV text", async () => {
    mocks.listSubstantialContextItems.mockResolvedValue(SUBSTANTIAL_ITEMS);
    mocks.getPrimaryCvText.mockResolvedValue("My CV");
    mocks.runProfileOperation.mockResolvedValue({ ok: true, result: { suggestions: [] } });

    await suggestCvUpdates("user_1");

    const params = mocks.runProfileOperation.mock.calls[0][0];
    expect(params.input).toEqual({ cvText: "My CV", items: SUBSTANTIAL_ITEMS });
    expect(params.select({ suggestCvUpdates: "suggest-operation" })).toBe("suggest-operation");
  });

  it("drops suggestions that refer to an item id that was not sent", async () => {
    mocks.listSubstantialContextItems.mockResolvedValue(SUBSTANTIAL_ITEMS);
    mocks.getPrimaryCvText.mockResolvedValue("My CV");
    mocks.runProfileOperation.mockResolvedValue({
      ok: true,
      result: {
        suggestions: [
          { itemId: "i1", bullet: "Shipped passkeys on iOS and Android" },
          { itemId: "foreign", bullet: "Invented bullet" },
        ],
      },
    });

    await expect(suggestCvUpdates("user_1")).resolves.toEqual({
      status: "ok",
      suggestions: [{ itemId: "i1", bullet: "Shipped passkeys on iOS and Android" }],
    });
  });

  it("returns skipped with the reason when AI is unavailable", async () => {
    mocks.listSubstantialContextItems.mockResolvedValue(SUBSTANTIAL_ITEMS);
    mocks.getPrimaryCvText.mockResolvedValue("My CV");
    mocks.runProfileOperation.mockResolvedValue({ ok: false, reason: "AI_ACCESS_REQUIRED" });

    await expect(suggestCvUpdates("user_1")).resolves.toEqual({ status: "skipped", reason: "AI_ACCESS_REQUIRED" });
  });
});
