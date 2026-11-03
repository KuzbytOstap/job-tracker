import { z } from "zod";
import { CV_TEXT_MAX_LENGTH } from "@/lib/profile/limits";
import type { AiUsageReport } from "@/lib/ai/token-usage";

const identityField = z.string().trim().max(200).nullable();

export const cvExtractionResultSchema = z
  .object({
    text: z.string().trim().min(1).max(CV_TEXT_MAX_LENGTH),
    identity: z
      .object({
        firstName: identityField,
        lastName: identityField,
        email: identityField,
        phone: identityField,
        city: identityField,
      })
      .strict(),
  })
  .strict();

export const contextScoreResultSchema = z
  .object({
    weight: z.enum(["COVERED", "SUBSTANTIAL", "MINOR"]),
    impact: z.number().int().min(1).max(5).nullable(),
  })
  .strict()
  .refine((value) => (value.weight === "SUBSTANTIAL" ? value.impact !== null : value.impact === null), {
    message: "impact is required for SUBSTANTIAL items and must be null otherwise",
  });

export const cvSuggestionsResultSchema = z
  .object({
    suggestions: z
      .array(z.object({ itemId: z.string().trim().min(1), bullet: z.string().trim().min(1).max(300) }).strict())
      .max(20),
  })
  .strict();

export const coverLetterResultSchema = z
  .object({
    letter: z.string().trim().min(1).max(8000),
  })
  .strict();

export type CvExtractionInput = { fileName: string; pdfBase64: string };
export type CvExtractionResult = z.infer<typeof cvExtractionResultSchema>;

export type ContextScoreInput = { cvText: string; itemText: string };
export type ContextScoreResult = z.infer<typeof contextScoreResultSchema>;

export type CvSuggestionsInput = { cvText: string; items: { id: string; text: string }[] };
export type CvSuggestionsResult = z.infer<typeof cvSuggestionsResultSchema>;

export type CoverLetterInput = {
  basePrompt: string;
  cvText: string;
  contextItems: string[];
  examples: { vacancyText: string; letterText: string }[];
  signatureName: string | null;
  vacancyText: string;
  company: string | null;
  position: string | null;
};
export type CoverLetterResult = z.infer<typeof coverLetterResultSchema>;

export type ProfileAiOperation<I, O> = {
  readonly maxOutputTokens: number;
  countInputTokens(input: I): Promise<number>;
  run(input: I, options?: { onUsage?: (usage: AiUsageReport) => void }): Promise<O>;
};

export interface ProfileAiProvider {
  readonly name: "mock" | "openai";
  readonly extractCv: ProfileAiOperation<CvExtractionInput, CvExtractionResult>;
  readonly scoreContextItem: ProfileAiOperation<ContextScoreInput, ContextScoreResult>;
  readonly suggestCvUpdates: ProfileAiOperation<CvSuggestionsInput, CvSuggestionsResult>;
  readonly generateCoverLetter: ProfileAiOperation<CoverLetterInput, CoverLetterResult>;
}

export type ProfileAiProviderErrorKind =
  | "configuration"
  | "rate_limit"
  | "timeout"
  | "network"
  | "invalid_result";

export class ProfileAiProviderError extends Error {
  readonly kind: ProfileAiProviderErrorKind;

  constructor(message: string, kind: ProfileAiProviderErrorKind = "invalid_result") {
    super(message);
    this.name = "ProfileAiProviderError";
    this.kind = kind;
  }
}
