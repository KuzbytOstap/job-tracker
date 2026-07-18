import { z } from "zod";
import { PLATFORM_VALUES } from "@/lib/validation";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function nullableTrimmedString() {
  return z
    .string()
    .nullable()
    .transform((value) => {
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    });
}

const nullableLink = z
  .string()
  .nullable()
  .transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value === null || isHttpUrl(value), {
    message: "link must be a valid http or https URL",
  });

export const applicationExtractionResultSchema = z
  .object({
    company: nullableTrimmedString(),
    position: nullableTrimmedString(),
    platform: z.enum(PLATFORM_VALUES).nullable(),
    link: nullableLink,
    salaryExpectation: nullableTrimmedString(),
    notes: nullableTrimmedString(),
  })
  .strict();

export type ApplicationExtractionResult = z.infer<typeof applicationExtractionResultSchema>;

export const applicationExtractionInputSchema = z
  .object({
    jobPostingText: z.string().trim().min(1, "Job posting text is required").max(50_000, "Job posting text is too long"),
    coverLetterText: z.string().trim().max(20_000, "Cover letter text is too long").optional(),
  })
  .strict();

export type ApplicationExtractionInput = z.infer<typeof applicationExtractionInputSchema>;

export function emptyApplicationExtractionResult(): ApplicationExtractionResult {
  return {
    company: null,
    position: null,
    platform: null,
    link: null,
    salaryExpectation: null,
    notes: null,
  };
}

export const applicationExtractionProviderNameSchema = z.enum(["mock"]);

export const applicationExtractionResponseSchema = z
  .object({
    result: applicationExtractionResultSchema,
    meta: z
      .object({
        provider: applicationExtractionProviderNameSchema,
      })
      .strict(),
  })
  .strict();

export type ApplicationExtractionResponse = z.infer<typeof applicationExtractionResponseSchema>;
