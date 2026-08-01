import { describe, expect, it } from "vitest";
import { Platform } from "@/app/generated/prisma/enums";
import {
  applicationExtractionInputSchema,
  applicationExtractionProviderNameSchema,
  applicationExtractionResponseSchema,
  applicationExtractionResultSchema,
} from "@/lib/application-extraction";

describe("applicationExtractionResultSchema", () => {
  it("accepts a complete valid result", () => {
    const result = applicationExtractionResultSchema.parse({
      company: "Acme",
      position: "Engineer",
      platform: Platform.LINKEDIN,
      link: "https://www.linkedin.com/jobs/view/123",
      salaryExpectation: "$4000-5000",
      notes: "A short summary.",
    });

    expect(result).toEqual({
      company: "Acme",
      position: "Engineer",
      platform: Platform.LINKEDIN,
      link: "https://www.linkedin.com/jobs/view/123",
      salaryExpectation: "$4000-5000",
      notes: "A short summary.",
    });
  });

  it("accepts an all-null result", () => {
    const result = applicationExtractionResultSchema.parse({
      company: null,
      position: null,
      platform: null,
      link: null,
      salaryExpectation: null,
      notes: null,
    });

    expect(result).toEqual({
      company: null,
      position: null,
      platform: null,
      link: null,
      salaryExpectation: null,
      notes: null,
    });
  });

  it("rejects an unknown field", () => {
    const parsed = applicationExtractionResultSchema.safeParse({
      company: null,
      position: null,
      platform: null,
      link: null,
      salaryExpectation: null,
      notes: null,
      modelName: "gpt-5",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid platform", () => {
    const parsed = applicationExtractionResultSchema.safeParse({
      company: null,
      position: null,
      platform: "NOT_A_PLATFORM",
      link: null,
      salaryExpectation: null,
      notes: null,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid link", () => {
    const parsed = applicationExtractionResultSchema.safeParse({
      company: null,
      position: null,
      platform: null,
      link: "not-a-url",
      salaryExpectation: null,
      notes: null,
    });

    expect(parsed.success).toBe(false);
  });

  it("normalizes empty strings to null", () => {
    const result = applicationExtractionResultSchema.parse({
      company: "  ",
      position: "",
      platform: null,
      link: "",
      salaryExpectation: "  Acme  ",
      notes: "",
    });

    expect(result.company).toBeNull();
    expect(result.position).toBeNull();
    expect(result.link).toBeNull();
    expect(result.salaryExpectation).toBe("Acme");
    expect(result.notes).toBeNull();
  });
});

describe("applicationExtractionInputSchema", () => {
  it("requires a non-empty posting", () => {
    const parsed = applicationExtractionInputSchema.safeParse({ jobPostingText: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized posting text", () => {
    const parsed = applicationExtractionInputSchema.safeParse({
      jobPostingText: "a".repeat(50_001),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized cover letter text", () => {
    const parsed = applicationExtractionInputSchema.safeParse({
      jobPostingText: "Valid posting",
      coverLetterText: "a".repeat(20_001),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown request properties", () => {
    const parsed = applicationExtractionInputSchema.safeParse({
      jobPostingText: "Valid posting",
      applicationId: "app-1",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid minimal request", () => {
    const parsed = applicationExtractionInputSchema.safeParse({ jobPostingText: "Valid posting" });
    expect(parsed.success).toBe(true);
  });
});

describe("applicationExtractionResponseSchema", () => {
  it("accepts a response carrying deterministically extracted sourceUrls", () => {
    const parsed = applicationExtractionResponseSchema.safeParse({
      result: {
        company: null,
        position: null,
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      },
      sourceUrls: ["https://example.com/jobs/1", "https://jobs.dou.ua/companies/acme/vacancies/1/"],
      meta: { provider: "mock" },
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts an empty sourceUrls array", () => {
    const parsed = applicationExtractionResponseSchema.safeParse({
      result: {
        company: null,
        position: null,
        platform: null,
        link: null,
        salaryExpectation: null,
        notes: null,
      },
      sourceUrls: [],
      meta: { provider: "openai" },
    });

    expect(parsed.success).toBe(true);
  });
});

describe("applicationExtractionProviderNameSchema", () => {
  it("accepts 'mock' and 'openai'", () => {
    expect(applicationExtractionProviderNameSchema.safeParse("mock").success).toBe(true);
    expect(applicationExtractionProviderNameSchema.safeParse("openai").success).toBe(true);
  });

  it("rejects an unsupported provider name", () => {
    expect(applicationExtractionProviderNameSchema.safeParse("anthropic").success).toBe(false);
  });
});
