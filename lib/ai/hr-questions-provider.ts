import { z } from "zod";
import type { AiUsageReport } from "@/lib/ai/token-usage";

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
  readonly maxOutputTokens: number;

  /**
   * Exact input-token count for the same request `generateAdditionalQuestions`
   * would send, obtained from the provider itself rather than approximated —
   * quota reservation must know the real cost before committing to it.
   */
  countInputTokens(input: HrQuestionsGenerationInput): Promise<number>;

  generateAdditionalQuestions(
    input: HrQuestionsGenerationInput,
    options?: { onUsage?: (usage: AiUsageReport) => void },
  ): Promise<HrQuestionsGenerationResult>;
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
