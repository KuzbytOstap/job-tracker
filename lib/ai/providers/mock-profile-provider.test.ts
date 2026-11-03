import { describe, expect, it } from "vitest";
import { ProfileAiProviderError } from "@/lib/ai/profile-provider";
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

    expect(result.letter).toContain("your company");
    expect(result.letter).toContain("this role");
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
