import OpenAI from "openai";
import { ApplicationExtractionProviderError } from "@/lib/ai/application-extraction-provider";

// Requests are single-shot (one Analyze click = at most one call), so a
// generous-but-finite timeout is safe and automatic retries would risk
// duplicate paid requests.
const OPENAI_TIMEOUT_MS = 30_000;
const OPENAI_MAX_RETRIES = 0;

let cachedClient: OpenAI | null = null;

/**
 * Lazily creates the OpenAI client on first use so importing this module
 * (or selecting AI_PROVIDER=mock) never requires OPENAI_API_KEY.
 */
export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ApplicationExtractionProviderError(
      "OPENAI_API_KEY is not configured. Set it to enable AI_PROVIDER=openai.",
      "configuration",
    );
  }

  cachedClient = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: OPENAI_MAX_RETRIES,
  });

  return cachedClient;
}
