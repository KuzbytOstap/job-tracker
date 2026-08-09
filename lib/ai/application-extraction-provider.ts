import type {
  ApplicationExtractionInput,
  ApplicationExtractionResult,
} from "@/lib/application-extraction";
import type { AiUsageReport } from "@/lib/ai/token-usage";

export interface ApplicationExtractionProvider {
  readonly name: string;
  readonly maxOutputTokens: number;

  /**
   * Exact input-token count for the same request `extractApplication` would
   * send, obtained from the provider itself rather than approximated —
   * quota reservation must know the real cost before committing to it.
   */
  countInputTokens(input: ApplicationExtractionInput): Promise<number>;

  extractApplication(
    input: ApplicationExtractionInput,
    options?: { onUsage?: (usage: AiUsageReport) => void },
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
