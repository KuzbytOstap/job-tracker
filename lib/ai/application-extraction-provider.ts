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

export type ApplicationExtractionErrorKind =
  | "configuration"
  | "rate_limit"
  | "timeout"
  | "network"
  | "invalid_result";

export class ApplicationExtractionProviderError extends Error {
  readonly kind: ApplicationExtractionErrorKind;

  constructor(message: string, kind: ApplicationExtractionErrorKind = "invalid_result") {
    super(message);
    this.name = "ApplicationExtractionProviderError";
    this.kind = kind;
  }
}
