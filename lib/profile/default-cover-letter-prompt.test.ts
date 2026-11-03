import { describe, expect, it } from "vitest";
import { DEFAULT_COVER_LETTER_PROMPT } from "@/lib/profile/default-cover-letter-prompt";
import { COVER_LETTER_PROMPT_MAX_LENGTH } from "@/lib/profile/limits";

describe("DEFAULT_COVER_LETTER_PROMPT", () => {
  it("states the 150 to 250 word target", () => {
    expect(DEFAULT_COVER_LETTER_PROMPT).toContain("150 to 250 words");
  });

  it("forbids inventing facts", () => {
    expect(DEFAULT_COVER_LETTER_PROMPT).toMatch(/never invent/i);
  });

  it("fits the prompt length limit so a user can edit and save it unchanged", () => {
    expect(DEFAULT_COVER_LETTER_PROMPT.length).toBeLessThanOrEqual(COVER_LETTER_PROMPT_MAX_LENGTH);
  });
});
