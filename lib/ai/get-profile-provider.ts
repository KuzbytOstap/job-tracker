import { ProfileAiProviderError, type ProfileAiProvider } from "@/lib/ai/profile-provider";
import { MockProfileAiProvider } from "@/lib/ai/providers/mock-profile-provider";
import { OpenAIProfileAiProvider } from "@/lib/ai/providers/openai-profile-provider";

export function getProfileProvider(): ProfileAiProvider {
  const providerName = process.env.AI_PROVIDER;

  if (!providerName) {
    throw new ProfileAiProviderError(
      "AI_PROVIDER is not configured. Set AI_PROVIDER=mock to enable profile AI.",
      "configuration",
    );
  }

  if (providerName === "mock") {
    return new MockProfileAiProvider();
  }

  if (providerName === "openai") {
    return new OpenAIProfileAiProvider();
  }

  throw new ProfileAiProviderError(`Unsupported AI_PROVIDER: "${providerName}".`, "configuration");
}
