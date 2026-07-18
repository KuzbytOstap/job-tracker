import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";
import type { ApplicationExtractionProvider } from "@/lib/ai/application-extraction-provider";
import { MockApplicationExtractionProvider } from "@/lib/ai/providers/mock-application-extraction-provider";

export function getApplicationExtractionProvider(): ApplicationExtractionProvider {
  const providerName = process.env.AI_PROVIDER;

  if (!providerName) {
    throw new ApplicationExtractionProviderError(
      "AI_PROVIDER is not configured. Set AI_PROVIDER=mock to enable AI-assisted form filling.",
    );
  }

  if (providerName === "mock") {
    return new MockApplicationExtractionProvider();
  }

  throw new ApplicationExtractionProviderError(`Unsupported AI_PROVIDER: "${providerName}".`);
}
