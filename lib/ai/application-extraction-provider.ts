import type {
  ApplicationExtractionInput,
  ApplicationExtractionResult,
} from "@/lib/application-extraction";

export interface ApplicationExtractionProvider {
  readonly name: string;

  extractApplication(
    input: ApplicationExtractionInput,
  ): Promise<ApplicationExtractionResult>;
}

export class ApplicationExtractionProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationExtractionProviderError";
  }
}
