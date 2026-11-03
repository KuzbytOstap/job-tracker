import {
  ProfileAiProviderError,
  type ContextScoreInput,
  type ContextScoreResult,
  type CvExtractionInput,
  type CvExtractionResult,
  type CvSuggestionsInput,
  type CvSuggestionsResult,
  type ProfileAiOperation,
  type ProfileAiProvider,
} from "@/lib/ai/profile-provider";

const ERROR_MARKER = "[mock:profile-error]";

function failIfMarked(...values: string[]) {
  if (values.some((value) => value.includes(ERROR_MARKER))) {
    throw new ProfileAiProviderError("Mock profile AI failure");
  }
}

function mockOperation<I, O>(maxOutputTokens: number, run: (input: I) => O): ProfileAiOperation<I, O> {
  return {
    maxOutputTokens,
    async countInputTokens(): Promise<number> {
      return 0;
    },
    async run(input: I): Promise<O> {
      return run(input);
    },
  };
}

export class MockProfileAiProvider implements ProfileAiProvider {
  readonly name = "mock";

  readonly extractCv: ProfileAiOperation<CvExtractionInput, CvExtractionResult> = mockOperation(
    4_000,
    (input: CvExtractionInput): CvExtractionResult => {
      failIfMarked(input.fileName);
      return {
        text: `Mock CV text extracted from ${input.fileName}`,
        identity: { firstName: "Mock", lastName: "User", email: "mock.user@example.com", phone: null, city: "Lviv" },
      };
    },
  );

  readonly scoreContextItem: ProfileAiOperation<ContextScoreInput, ContextScoreResult> = mockOperation(
    60,
    (input: ContextScoreInput): ContextScoreResult => {
      failIfMarked(input.itemText, input.cvText);
      if (input.cvText.includes(input.itemText)) return { weight: "COVERED", impact: null };
      if (/\d/.test(input.itemText)) return { weight: "SUBSTANTIAL", impact: 3 };
      return { weight: "MINOR", impact: null };
    },
  );

  readonly suggestCvUpdates: ProfileAiOperation<CvSuggestionsInput, CvSuggestionsResult> = mockOperation(
    800,
    (input: CvSuggestionsInput): CvSuggestionsResult => {
      failIfMarked(input.cvText, ...input.items.map((item) => item.text));
      return { suggestions: input.items.map((item) => ({ itemId: item.id, bullet: item.text })) };
    },
  );
}
