import {
  ProfileAiProviderError,
  type ContextScoreInput,
  type ContextScoreResult,
  type CoverLetterInput,
  type CoverLetterResult,
  type CvExtractionInput,
  type CvExtractionResult,
  type CvSuggestionsInput,
  type CvSuggestionsResult,
  type FitAnalysisInput,
  type FitAnalysisResult,
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

  readonly generateCoverLetter: ProfileAiOperation<CoverLetterInput, CoverLetterResult> = mockOperation(
    4_000,
    (input: CoverLetterInput): CoverLetterResult => {
      failIfMarked(input.vacancyText, input.cvText);
      const role = input.position ? `the ${input.position} role` : "this role";
      const lines = [
        input.company ? `Hello ${input.company} team,` : "Hello,",
        "",
        `This is a mock cover letter for ${role}, written from the CV and ${input.contextItems.length} extra notes.`,
      ];
      if (input.signatureName) lines.push("", input.signatureName);
      return { letter: lines.join("\n") };
    },
  );

  readonly analyzeFit: ProfileAiOperation<FitAnalysisInput, FitAnalysisResult> = mockOperation(
    2_500,
    (input: FitAnalysisInput): FitAnalysisResult => {
      failIfMarked(input.vacancyText, input.cvText);
      return {
        items: [
          {
            criterion: "SALARY",
            verdict: "MISMATCH",
            vacancyValue: "Up to 3000 USD per month",
            yourValue: "At least 4000 USD per month",
            reason: "The offered salary is below your expectation.",
          },
          {
            criterion: "WORK_FORMAT",
            verdict: "MATCH",
            vacancyValue: "Remote",
            yourValue: "Remote",
            reason: "The vacancy is remote and you prefer remote work.",
          },
          {
            criterion: "EMPLOYMENT_TYPE",
            verdict: "UNKNOWN",
            vacancyValue: null,
            yourValue: null,
            reason: "The vacancy does not mention the employment type.",
          },
          {
            criterion: "EXPERIENCE_YEARS",
            verdict: "MISMATCH",
            vacancyValue: "7+ years",
            yourValue: "About 5 years in the CV",
            reason: "The vacancy asks for 7 years and the CV shows about 5 years of relevant experience.",
          },
          {
            criterion: "TECHNOLOGIES",
            verdict: "MATCH",
            vacancyValue: "React, TypeScript",
            yourValue: "React, TypeScript in the CV",
            reason: "Both required technologies are confirmed by the CV.",
          },
        ],
      };
    },
  );
}
