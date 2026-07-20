import type {
  HrQuestionsGenerationInput,
  HrQuestionsGenerationResult,
  HrQuestionsProvider,
} from "@/lib/ai/hr-questions-provider";

// Distinct from the extraction provider's `[mock:error]` marker so testing
// this feature never accidentally interacts with vacancy-extraction mocks.
const ERROR_MARKER = "[mock:hr-error]";

// Fixed fixture: deterministic per the mock provider's contract (same input
// text never changes the outcome), and none of these duplicate a core
// question.
const FIXTURE_QUESTIONS: readonly string[] = [
  "Why do you want to work with AI coding tools in this role?",
  "How strong is your experience with the technologies mentioned in this vacancy?",
  "Are you comfortable with the employment format and time zone described in the posting?",
];

function haystack(input: HrQuestionsGenerationInput): string {
  return [input.notes, input.jobPostingText, input.coverLetterText].filter(Boolean).join("\n");
}

export class MockHrQuestionsProvider implements HrQuestionsProvider {
  readonly name = "mock";

  async generateAdditionalQuestions(
    input: HrQuestionsGenerationInput,
  ): Promise<HrQuestionsGenerationResult> {
    if (haystack(input).includes(ERROR_MARKER)) {
      throw new Error("Mock HR question generation failure");
    }

    return { additionalQuestions: [...FIXTURE_QUESTIONS] };
  }
}
