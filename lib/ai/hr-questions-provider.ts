import { z } from "zod";

export type HrQuestionsGenerationInput = {
  company: string;
  position: string;
  platform: string;
  salaryExpectation: string | null;
  notes: string | null;
  jobPostingText: string | null;
  coverLetterText: string | null;
};

export const hrQuestionsGenerationResultSchema = z
  .object({
    additionalQuestions: z.array(z.string().trim().min(1).max(140)).max(4),
  })
  .strict();

export type HrQuestionsGenerationResult = z.infer<typeof hrQuestionsGenerationResultSchema>;

export interface HrQuestionsProvider {
  readonly name: string;

  generateAdditionalQuestions(input: HrQuestionsGenerationInput): Promise<HrQuestionsGenerationResult>;
}

export type HrQuestionsProviderErrorKind =
  | "configuration"
  | "rate_limit"
  | "timeout"
  | "network"
  | "invalid_result";

export class HrQuestionsProviderError extends Error {
  readonly kind: HrQuestionsProviderErrorKind;

  constructor(message: string, kind: HrQuestionsProviderErrorKind = "invalid_result") {
    super(message);
    this.name = "HrQuestionsProviderError";
    this.kind = kind;
  }
}
