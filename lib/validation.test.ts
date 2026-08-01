import { describe, expect, it } from "vitest";
import { createApplicationSchema, updateApplicationSchema } from "@/lib/validation";

const baseInput = {
  company: "Acme",
  position: "Engineer",
  platform: "DIRECT" as const,
};

describe("createApplicationSchema — source texts", () => {
  it("accepts both source texts as valid, optional fields", () => {
    const result = createApplicationSchema.safeParse({
      ...baseInput,
      jobPostingText: "We are hiring an engineer.",
      coverLetterText: "Dear hiring manager,",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBe("We are hiring an engineer.");
      expect(result.data.coverLetterText).toBe("Dear hiring manager,");
    }
  });

  it("allows both fields to be omitted entirely", () => {
    const result = createApplicationSchema.safeParse(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBeUndefined();
      expect(result.data.coverLetterText).toBeUndefined();
    }
  });

  it("normalizes an empty string to null", () => {
    const result = createApplicationSchema.safeParse({
      ...baseInput,
      jobPostingText: "",
      coverLetterText: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBeNull();
      expect(result.data.coverLetterText).toBeNull();
    }
  });

  it("normalizes a whitespace-only string to null", () => {
    const result = createApplicationSchema.safeParse({
      ...baseInput,
      jobPostingText: "   \n\t  ",
      coverLetterText: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBeNull();
      expect(result.data.coverLetterText).toBeNull();
    }
  });

  it("preserves internal line breaks and formatting", () => {
    const text = "Line one\nLine two\n\nLine four";
    const result = createApplicationSchema.safeParse({ ...baseInput, jobPostingText: text });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBe(text);
    }
  });

  it("rejects an oversized job posting", () => {
    const result = createApplicationSchema.safeParse({
      ...baseInput,
      jobPostingText: "a".repeat(50_001),
    });

    expect(result.success).toBe(false);
  });

  it("accepts a job posting at exactly the maximum length", () => {
    const result = createApplicationSchema.safeParse({
      ...baseInput,
      jobPostingText: "a".repeat(50_000),
    });

    expect(result.success).toBe(true);
  });

  it("rejects an oversized cover letter", () => {
    const result = createApplicationSchema.safeParse({
      ...baseInput,
      coverLetterText: "a".repeat(20_001),
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown properties", () => {
    const result = createApplicationSchema.safeParse({ ...baseInput, extraField: "nope" });
    expect(result.success).toBe(false);
  });
});

describe("updateApplicationSchema — source texts", () => {
  it("accepts an explicit null to clear a previously stored value", () => {
    const result = updateApplicationSchema.safeParse({
      jobPostingText: null,
      coverLetterText: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBeNull();
      expect(result.data.coverLetterText).toBeNull();
    }
  });

  it("leaves the fields untouched (undefined) when omitted", () => {
    const result = updateApplicationSchema.safeParse({ company: "Acme" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBeUndefined();
      expect(result.data.coverLetterText).toBeUndefined();
    }
  });

  it("updates both fields to new values", () => {
    const result = updateApplicationSchema.safeParse({
      jobPostingText: "Updated posting",
      coverLetterText: "Updated cover letter",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobPostingText).toBe("Updated posting");
      expect(result.data.coverLetterText).toBe("Updated cover letter");
    }
  });
});

describe("updateApplicationSchema — hrCallTranscript", () => {
  it("accepts a transcript string", () => {
    const result = updateApplicationSchema.safeParse({ hrCallTranscript: "Discussed comp." });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hrCallTranscript).toBe("Discussed comp.");
    }
  });

  it("accepts an explicit null to clear a previously stored transcript", () => {
    const result = updateApplicationSchema.safeParse({ hrCallTranscript: null });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hrCallTranscript).toBeNull();
    }
  });

  it("leaves the field untouched (undefined) when omitted", () => {
    const result = updateApplicationSchema.safeParse({ company: "Acme" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hrCallTranscript).toBeUndefined();
    }
  });

  it("rejects an oversized transcript", () => {
    const result = updateApplicationSchema.safeParse({ hrCallTranscript: "a".repeat(50_001) });

    expect(result.success).toBe(false);
  });

  it("accepts a transcript at exactly the maximum length", () => {
    const result = updateApplicationSchema.safeParse({ hrCallTranscript: "a".repeat(50_000) });

    expect(result.success).toBe(true);
  });
});
