import type {
  HrQuestionsGenerationInput,
  HrQuestionsGenerationResult,
  HrQuestionsProvider,
} from "@/lib/ai/hr-questions-provider";

// Distinct from the extraction provider's `[mock:error]` marker so testing
// this feature never accidentally interacts with vacancy-extraction mocks.
const ERROR_MARKER = "[mock:hr-error]";

// Fixed fixture: deterministic per the mock provider's contract (same input
// text never changes the outcome), short and direct per the quality rules,
// and none of these duplicate a core question.
const FIXTURE_QUESTIONS: readonly string[] = [
  "How do you use AI coding tools in your daily work?",
  "How strong is your Node.js and Express experience?",
  "Have you worked on B2B SaaS products?",
  "Are you comfortable working in this time zone?",
];

function haystack(input: HrQuestionsGenerationInput): string {
  return [input.notes, input.jobPostingText, input.coverLetterText].filter(Boolean).join("\n");
}

export class MockHrQuestionsProvider implements HrQuestionsProvider {
  readonly name = "mock";
  readonly maxOutputTokens = 400;

  // Never actually called: mock calls are access-gated but bypass quota
  // reservation entirely, so nothing ever asks the mock provider to count
  // tokens. Implemented only to satisfy the provider interface.
  async countInputTokens(): Promise<number> {
    return 0;
  }

  async generateAdditionalQuestions(
    input: HrQuestionsGenerationInput,
  ): Promise<HrQuestionsGenerationResult> {
    if (haystack(input).includes(ERROR_MARKER)) {
      throw new Error("Mock HR question generation failure");
    }

    return { additionalQuestions: [...FIXTURE_QUESTIONS] };
  }
}
