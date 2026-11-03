import { describe, expect, it } from "vitest";
import { ProfileAiProviderError, fitAnalysisResultSchema } from "@/lib/ai/profile-provider";
import { MockProfileAiProvider } from "@/lib/ai/providers/mock-profile-provider";

const INPUT = {
  basePrompt: "Write a letter.",
  cvText: "Ten years of React Native.",
  contextItems: ["Shipped passkeys"],
  examples: [],
  signatureName: "Ada Lovelace",
  vacancyText: "We need a React Native engineer.",
  company: "Acme",
  position: "Senior Engineer",
};

describe("MockProfileAiProvider.generateCoverLetter", () => {
  it("returns a predictable letter naming the company, the position and the signature", async () => {
    const result = await new MockProfileAiProvider().generateCoverLetter.run(INPUT);

    expect(result.letter).toContain("Acme");
    expect(result.letter).toContain("Senior Engineer");
    expect(result.letter).toContain("Ada Lovelace");
    expect(await new MockProfileAiProvider().generateCoverLetter.run(INPUT)).toEqual(result);
  });

  it("falls back to neutral wording and skips the signature when they are missing", async () => {
    const result = await new MockProfileAiProvider().generateCoverLetter.run({
      ...INPUT,
      company: null,
      position: null,
      signatureName: null,
    });

    expect(result.letter.startsWith("Hello,")).toBe(true);
    expect(result.letter).toContain("mock cover letter for this role,");
    expect(result.letter).not.toContain("Ada Lovelace");
  });

  it("fails on the mock error marker in the vacancy text", async () => {
    await expect(
      new MockProfileAiProvider().generateCoverLetter.run({ ...INPUT, vacancyText: "[mock:profile-error]" }),
    ).rejects.toBeInstanceOf(ProfileAiProviderError);
  });

  it("exposes a 4000 token ceiling and a zero input token count", async () => {
    const operation = new MockProfileAiProvider().generateCoverLetter;

    expect(operation.maxOutputTokens).toBe(4_000);
    expect(await operation.countInputTokens(INPUT)).toBe(0);
  });
});

const FIT_INPUT = {
  vacancyText: "Senior React engineer, remote.",
  cvText: "Six years of React.",
  contextItems: [],
  searchPreferences: {
    salaryAmount: null,
    salaryCurrency: null,
    salaryPeriod: null,
    employmentTypes: [],
    workFormats: [],
  },
  company: "Acme",
  position: "Senior Engineer",
};

describe("MockProfileAiProvider.analyzeFit", () => {
  it("returns a predictable result with every criterion once in the fixed order", async () => {
    const result = await new MockProfileAiProvider().analyzeFit.run(FIT_INPUT);

    expect(result.items.map((item) => item.criterion)).toEqual([
      "SALARY",
      "WORK_FORMAT",
      "EMPLOYMENT_TYPE",
      "EXPERIENCE_YEARS",
      "TECHNOLOGIES",
    ]);
    expect(await new MockProfileAiProvider().analyzeFit.run(FIT_INPUT)).toEqual(result);
  });

  it("mixes MATCH, MISMATCH and UNKNOWN verdicts so every state can be checked by hand", async () => {
    const result = await new MockProfileAiProvider().analyzeFit.run(FIT_INPUT);
    const verdicts = new Set(result.items.map((item) => item.verdict));

    expect(verdicts).toEqual(new Set(["MATCH", "MISMATCH", "UNKNOWN"]));
  });

  it("returns a result that passes the provider result schema", async () => {
    const result = await new MockProfileAiProvider().analyzeFit.run(FIT_INPUT);

    expect(fitAnalysisResultSchema.safeParse(result).success).toBe(true);
  });

  it("fails on the mock error marker in the vacancy text", async () => {
    await expect(
      new MockProfileAiProvider().analyzeFit.run({ ...FIT_INPUT, vacancyText: "Role [mock:profile-error]" }),
    ).rejects.toBeInstanceOf(ProfileAiProviderError);
  });

  it("exposes a 2500 token ceiling and a zero input token count", async () => {
    const operation = new MockProfileAiProvider().analyzeFit;

    expect(operation.maxOutputTokens).toBe(2_500);
    expect(await operation.countInputTokens(FIT_INPUT)).toBe(0);
  });
});
