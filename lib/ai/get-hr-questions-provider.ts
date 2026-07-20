import { HrQuestionsProviderError } from "@/lib/ai/hr-questions-provider";
import type { HrQuestionsProvider } from "@/lib/ai/hr-questions-provider";
import { MockHrQuestionsProvider } from "@/lib/ai/providers/mock-hr-questions-provider";
import { OpenAIHrQuestionsProvider } from "@/lib/ai/providers/openai-hr-questions-provider";

export function getHrQuestionsProvider(): HrQuestionsProvider {
  const providerName = process.env.AI_PROVIDER;

  if (!providerName) {
    throw new HrQuestionsProviderError(
      "AI_PROVIDER is not configured. Set AI_PROVIDER=mock to enable HR question generation.",
      "configuration",
    );
  }

  if (providerName === "mock") {
    return new MockHrQuestionsProvider();
  }

  if (providerName === "openai") {
    return new OpenAIHrQuestionsProvider();
  }

  throw new HrQuestionsProviderError(`Unsupported AI_PROVIDER: "${providerName}".`, "configuration");
}
