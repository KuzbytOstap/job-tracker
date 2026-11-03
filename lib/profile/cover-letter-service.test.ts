import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveCvText: vi.fn(),
  getProfile: vi.fn(),
  listContextItems: vi.fn(),
  listExamples: vi.fn(),
  runProfileOperation: vi.fn(),
}));

vi.mock("@/lib/profile/cv-service", () => ({
  resolveCvText: (...args: unknown[]) => mocks.resolveCvText(...args),
}));

vi.mock("@/lib/profile/profile-service", () => ({
  getProfile: (...args: unknown[]) => mocks.getProfile(...args),
}));

vi.mock("@/lib/profile/context-items-service", () => ({
  listContextItems: (...args: unknown[]) => mocks.listContextItems(...args),
}));

vi.mock("@/lib/profile/examples-service", () => ({
  listExamples: (...args: unknown[]) => mocks.listExamples(...args),
}));

vi.mock("@/lib/profile/run-profile-ai", () => ({
  runProfileOperation: (...args: unknown[]) => mocks.runProfileOperation(...args),
}));

import { AiFeature } from "@/app/generated/prisma/client";
import { generateCoverLetter } from "@/lib/profile/cover-letter-service";
import { DEFAULT_COVER_LETTER_PROMPT } from "@/lib/profile/default-cover-letter-prompt";

const REQUEST = { vacancyText: "We need a React Native engineer.", company: "Acme", position: "Engineer" };

function profile(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    contactEmail: "ada@example.com",
    phone: "+380501112233",
    address: { street: "Main 1", postalCode: "79000", city: "Lviv", region: null, country: "UA" },
    salary: { amount: null, currency: null, period: null },
    employmentTypes: [],
    workFormats: [],
    coverLetterPrompt: null,
    defaultCoverLetterPrompt: DEFAULT_COVER_LETTER_PROMPT,
    ...overrides,
  };
}

function lastInput() {
  return mocks.runProfileOperation.mock.calls[0][0].input;
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.resolveCvText.mockResolvedValue({ status: "ok", text: "CV text" });
  mocks.getProfile.mockResolvedValue(profile());
  mocks.listContextItems.mockResolvedValue([]);
  mocks.listExamples.mockResolvedValue([]);
  mocks.runProfileOperation.mockResolvedValue({ ok: true, result: { letter: "Dear team" } });
});

describe("generateCoverLetter", () => {
  it("runs the cover letter operation under the COVER_LETTER feature and returns the letter", async () => {
    const outcome = await generateCoverLetter("user_1", REQUEST);

    expect(outcome).toEqual({ status: "ok", letter: "Dear team" });
    const params = mocks.runProfileOperation.mock.calls[0][0];
    expect(params.userId).toBe("user_1");
    expect(params.feature).toBe(AiFeature.COVER_LETTER);
    expect(params.select({ generateCoverLetter: "letter-operation" })).toBe("letter-operation");
  });

  it("resolves the CV for the chosen id, or the primary one when none is chosen", async () => {
    await generateCoverLetter("user_1", { ...REQUEST, cvId: "cv_2" });
    await generateCoverLetter("user_1", REQUEST);

    expect(mocks.resolveCvText).toHaveBeenNthCalledWith(1, "user_1", "cv_2");
    expect(mocks.resolveCvText).toHaveBeenNthCalledWith(2, "user_1", undefined);
    expect(lastInput().cvText).toBe("CV text");
  });

  it("falls back to the default prompt when the profile prompt is empty or blank", async () => {
    mocks.getProfile.mockResolvedValueOnce(profile({ coverLetterPrompt: null }));
    await generateCoverLetter("user_1", REQUEST);
    expect(lastInput().basePrompt).toBe(DEFAULT_COVER_LETTER_PROMPT);

    mocks.runProfileOperation.mockClear();
    mocks.getProfile.mockResolvedValueOnce(profile({ coverLetterPrompt: "   " }));
    await generateCoverLetter("user_1", REQUEST);
    expect(lastInput().basePrompt).toBe(DEFAULT_COVER_LETTER_PROMPT);
  });

  it("passes the profile prompt through unchanged when it is set", async () => {
    mocks.getProfile.mockResolvedValue(profile({ coverLetterPrompt: "Keep it under 100 words." }));

    await generateCoverLetter("user_1", REQUEST);

    expect(lastInput().basePrompt).toBe("Keep it under 100 words.");
  });

  it("sends the text of every context item and every example", async () => {
    mocks.listContextItems.mockResolvedValue([
      { id: "i1", text: "Shipped passkeys", weight: null, impact: null },
      { id: "i2", text: "Built Hot Updater", weight: null, impact: null },
    ]);
    mocks.listExamples.mockResolvedValue([{ id: "e1", vacancyText: "Old vacancy", letterText: "Old letter" }]);

    await generateCoverLetter("user_1", REQUEST);

    expect(lastInput().contextItems).toEqual(["Shipped passkeys", "Built Hot Updater"]);
    expect(lastInput().examples).toEqual([{ vacancyText: "Old vacancy", letterText: "Old letter" }]);
  });

  it("signs with the first and last name and invents nothing when they are missing", async () => {
    await generateCoverLetter("user_1", REQUEST);
    expect(lastInput().signatureName).toBe("Ada Lovelace");

    mocks.runProfileOperation.mockClear();
    mocks.getProfile.mockResolvedValueOnce(profile({ firstName: "Ada", lastName: null }));
    await generateCoverLetter("user_1", REQUEST);
    expect(lastInput().signatureName).toBe("Ada");

    mocks.runProfileOperation.mockClear();
    mocks.getProfile.mockResolvedValueOnce(profile({ firstName: null, lastName: "  " }));
    await generateCoverLetter("user_1", REQUEST);
    expect(lastInput().signatureName).toBeNull();
  });

  it("never sends the email, phone or address to the model", async () => {
    await generateCoverLetter("user_1", REQUEST);

    const serialized = JSON.stringify(lastInput());
    expect(serialized).not.toContain("ada@example.com");
    expect(serialized).not.toContain("+380501112233");
    expect(serialized).not.toContain("Main 1");
    expect(serialized).not.toContain("79000");
  });

  it("passes the vacancy text, company and position through, including missing labels as null", async () => {
    await generateCoverLetter("user_1", REQUEST);
    expect(lastInput()).toMatchObject({ vacancyText: REQUEST.vacancyText, company: "Acme", position: "Engineer" });

    mocks.runProfileOperation.mockClear();
    await generateCoverLetter("user_1", { vacancyText: "Text", company: null, position: null });
    expect(lastInput()).toMatchObject({ company: null, position: null });
  });

  it("skips with the CV reason and never reaches the model when the CV is missing", async () => {
    mocks.resolveCvText.mockResolvedValueOnce({ status: "missing", reason: "NO_CV_TEXT" });
    await expect(generateCoverLetter("user_1", REQUEST)).resolves.toEqual({ status: "skipped", reason: "NO_CV_TEXT" });

    mocks.resolveCvText.mockResolvedValueOnce({ status: "missing", reason: "CV_NOT_FOUND" });
    await expect(generateCoverLetter("user_1", { ...REQUEST, cvId: "cv_other" })).resolves.toEqual({
      status: "skipped",
      reason: "CV_NOT_FOUND",
    });

    expect(mocks.runProfileOperation).not.toHaveBeenCalled();
    expect(mocks.getProfile).not.toHaveBeenCalled();
  });

  it("skips with the failure reason when the AI operation does not succeed", async () => {
    mocks.runProfileOperation.mockResolvedValue({ ok: false, reason: "COVER_LETTER_LIMIT_REACHED" });

    await expect(generateCoverLetter("user_1", REQUEST)).resolves.toEqual({
      status: "skipped",
      reason: "COVER_LETTER_LIMIT_REACHED",
    });
  });
});
